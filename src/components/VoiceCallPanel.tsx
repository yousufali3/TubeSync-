import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { RoomState, User } from '../types';
import { Mic, MicOff, Phone, PhoneOff, Users, Loader2 } from 'lucide-react';

interface VoiceCallPanelProps {
  socket: Socket | null;
  roomState: RoomState;
  selfId: string;
  isHost: boolean;
}

export default function VoiceCallPanel({
  socket,
  roomState,
  selfId,
  isHost
}: VoiceCallPanelProps) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [startingMedia, setStartingMedia] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const audiosRef = useRef<Record<string, HTMLAudioElement>>({});
  
  const voiceCall = roomState.voiceCall || { active: false, startedAt: null, participants: [] };

  // Sync state if call ends remotely
  useEffect(() => {
    if (!voiceCall.active && inCall) {
      handleLeaveCall();
    }
  }, [voiceCall.active]);

  // Clean up all connections on unmount
  useEffect(() => {
    return () => {
      cleanupAllStreamsAndConnections();
    };
  }, []);

  // WebRTC Signals Router Listener
  useEffect(() => {
    if (!socket || !inCall) return;

    // A peer joined, so we (the sender) will initiate WebRTC handshake
    const handlePeerJoined = async ({ userId }: { userId: string }) => {
      if (userId === selfId) return;
      try {
        const pc = getOrCreatePeerConnection(userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-signal', {
          targetId: userId,
          signal: { type: 'offer', sdp: offer }
        });
      } catch (err) {
        console.error("WebRTC offer initiation failed:", err);
      }
    };

    const handlePeerLeft = ({ userId }: { userId: string }) => {
      closePeerConnection(userId);
    };

    const handleSignal = async ({ senderId, signal }: { senderId: string; signal: any }) => {
      try {
        if (signal.type === 'offer') {
          const pc = getOrCreatePeerConnection(senderId);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-signal', {
            targetId: senderId,
            signal: { type: 'answer', sdp: answer }
          });
        } else if (signal.type === 'answer') {
          const pc = pcsRef.current[senderId];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } else if (signal.type === 'candidate') {
          const pc = pcsRef.current[senderId];
          if (pc && signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error("WebRTC signal handling failed:", err);
      }
    };

    socket.on('voice-call-peer-joined', handlePeerJoined);
    socket.on('voice-call-peer-left', handlePeerLeft);
    socket.on('webrtc-signal', handleSignal);

    return () => {
      socket.off('voice-call-peer-joined', handlePeerJoined);
      socket.off('voice-call-peer-left', handlePeerLeft);
      socket.off('webrtc-signal', handleSignal);
    };
  }, [socket, inCall]);

  const cleanupAllStreamsAndConnections = () => {
    // Stop local mic stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    // Close RTCPeerConnections
    Object.keys(pcsRef.current).forEach(peerId => {
      closePeerConnection(peerId);
    });
    pcsRef.current = {};
    // Delete player nodes
    Object.values(audiosRef.current).forEach((audio: any) => {
      audio.pause();
      audio.remove();
    });
    audiosRef.current = {};
    setInCall(false);
    setIsMuted(false);
  };

  const closePeerConnection = (peerId: string) => {
    const pc = pcsRef.current[peerId];
    if (pc) {
      try {
        pc.close();
      } catch (e) {
        console.error(e);
      }
      delete pcsRef.current[peerId];
    }

    const audio = audiosRef.current[peerId];
    if (audio) {
      try {
        audio.pause();
        audio.remove();
      } catch (e) {
        console.error(e);
      }
      delete audiosRef.current[peerId];
    }
  };

  const getOrCreatePeerConnection = (peerId: string): RTCPeerConnection => {
    if (pcsRef.current[peerId]) {
      return pcsRef.current[peerId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-signal', {
          targetId: peerId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Receive incoming stream tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        playStreamForPeer(peerId, stream);
      }
    };

    // Push local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pcsRef.current[peerId] = pc;
    return pc;
  };

  const playStreamForPeer = (peerId: string, stream: MediaStream) => {
    // If existing player, update stream
    let audio = audiosRef.current[peerId];
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      audiosRef.current[peerId] = audio;
    }
    audio.srcObject = stream;
    audio.play().catch(e => console.error("Audio playback failed", e));
  };

  // UI Event Triggers
  const handleStartCallByHost = () => {
    if (!socket || !isHost) return;
    socket.emit('start-voice-call');
    // Host auto-connects to their own call
    setTimeout(() => {
      handleJoinCall();
    }, 200);
  };

  const handleEndCallByHost = () => {
    if (!socket || !isHost) return;
    cleanupAllStreamsAndConnections();
    socket.emit('end-voice-call');
  };

  const handleJoinCall = async () => {
    if (!socket) return;
    setStartingMedia(true);
    try {
      // Capture microphone audio securely
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setInCall(true);
      setIsMuted(false);
      socket.emit('join-voice-call');
    } catch (err) {
      console.error("Microphone capture failed:", err);
      alert("Microphone permission was denied. Please allow microphone access to participate in the voice call!");
    } finally {
      setStartingMedia(false);
    }
  };

  const handleLeaveCall = () => {
    if (!socket) return;
    cleanupAllStreamsAndConnections();
    socket.emit('leave-voice-call');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const nextMute = !audioTrack.enabled;
        audioTrack.enabled = nextMute; // enabled triggers audio transmission
        setIsMuted(!nextMute);
      }
    }
  };

  // Match participant names to user records
  const getParticipantName = (id: string) => {
    const found = roomState.users.find(u => u.id === id);
    if (found) {
      return id === selfId ? "You" : found.name;
    }
    return `User_${id.slice(0, 4)}`;
  };

  const getParticipantHostStatus = (id: string) => {
    const found = roomState.users.find(u => u.id === id);
    return found ? found.isHost : false;
  };

  return (
    <div className={`room-soft-card bg-white border rounded-2xl p-4 sm:p-5 select-none relative overflow-hidden transition-all duration-300 ${
      voiceCall.active ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-100'
    }`}>
      {voiceCall.active && (
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100/40 blur-3xl rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
            voiceCall.active
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
              : 'bg-indigo-50 border border-indigo-100 text-indigo-500'
          }`}>
            {voiceCall.active ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-800">Room Audio Link</h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                voiceCall.active
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {voiceCall.active ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              {voiceCall.active
                ? `${voiceCall.participants.length} connected in conversation`
                : 'Host can launch spatial conversation for members anytime.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {startingMedia && (
            <div className="flex items-center text-xs text-slate-500 gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Allow Mic Access...</span>
            </div>
          )}

          {!voiceCall.active ? (
            isHost ? (
              <button
                onClick={handleStartCallByHost}
                className="room-btn-primary active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Phone className="w-4 h-4" />
                Start Voice Call
              </button>
            ) : (
              <span className="text-slate-400 text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                Waiting for host to start call...
              </span>
            )
          ) : (
            <>
              {inCall ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className={`p-2.5 rounded-xl cursor-pointer active:scale-95 border transition-all ${
                      isMuted
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleLeaveCall}
                    className="bg-red-500 hover:bg-red-600 cursor-pointer active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Leave
                  </button>
                  {isHost && (
                    <button
                      onClick={handleEndCallByHost}
                      className="bg-slate-100 hover:bg-slate-200 cursor-pointer active:scale-95 border border-slate-200 text-slate-600 font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
                    >
                      End for All
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleJoinCall}
                    className="bg-emerald-500 hover:bg-emerald-600 cursor-pointer active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    Join Call
                  </button>
                  {isHost && (
                    <button
                      onClick={handleEndCallByHost}
                      className="bg-red-50 hover:bg-red-100 border border-red-100 cursor-pointer text-red-600 font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
                    >
                      End Call
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {voiceCall.active && voiceCall.participants.length > 0 && (
        <div className="relative z-10 mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2.5">
            <Users className="w-3.5 h-3.5" />
            <span>Call Members ({voiceCall.participants.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {voiceCall.participants.map(pid => {
              const isUserSelf = pid === selfId;
              const name = getParticipantName(pid);
              const hostStatus = getParticipantHostStatus(pid);

              return (
                <div
                  key={pid}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isUserSelf
                      ? 'bg-blue-50 border-blue-100 text-blue-700'
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>{name}</span>
                  {hostStatus && (
                    <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1 py-px rounded font-bold">
                      HOST
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
