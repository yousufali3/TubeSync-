import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { RoomState, ChatMessage } from '../types';
import RoomHeader from './RoomHeader';
import VideoPlayer from './VideoPlayer';
import PlaylistPanel from './PlaylistPanel';
import ChatPanel from './ChatPanel';
import UserList from './UserList';
import VoiceCallPanel from './VoiceCallPanel';
import { Users, MessageSquare, ListVideo, Bell } from 'lucide-react';

interface RoomPageProps {
  roomId: string;
  userName: string;
  onLeave: () => void;
}

export default function RoomPage({ roomId, userName, onLeave }: RoomPageProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selfId, setSelfId] = useState('');
  const [isHost, setIsHost] = useState(false);
  
  // Mobile Tab toggle: controls bottom half on responsive sizes
  const [activeMobileTab, setActiveMobileTab] = useState<'playlist' | 'chat' | 'viewers'>('playlist');

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  useEffect(() => {
    // Connect Socket.IO to home origin proxy
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    // Join room instantly on connect
    newSocket.emit('join-room', { roomId, name: userName });

    // Establish Socket.IO Event Handlers
    newSocket.on('init-state', ({ room, chatHistory: initChat, selfId: sId, isHost: hostStatus }) => {
      setRoomState(room);
      setChatHistory(initChat);
      setSelfId(sId);
      setIsHost(hostStatus);
    });

    newSocket.on('user-joined', ({ user, users }) => {
      setRoomState(prev => {
        if (!prev) return null;
        return { ...prev, users };
      });
      showToast(`${user.name} stepped in!`);
    });

    newSocket.on('user-left', ({ userId, users }) => {
      setRoomState(prev => {
        if (!prev) return null;
        const target = prev.users.find(u => u.id === userId);
        if (target) {
          showToast(`${target.name} waved goodbye!`);
        }
        return { ...prev, users };
      });
    });

    // Chat Message Recipient
    newSocket.on('receive-message', (msg: ChatMessage) => {
      setChatHistory(prev => {
        const next = [...prev, msg];
        return next.slice(-100); // Buffer size 100 messages max
      });
    });

    // Typing Updates
    newSocket.on('typing-updated', ({ typingUsers: activeTypers }: { typingUsers: string[] }) => {
      // Exclude self from typing list representation
      const filtered = activeTypers.filter(name => name !== userName);
      setTypingUsers(filtered);
    });

    // Playlist mutations
    newSocket.on('playlist-updated', ({ playlist, playback }) => {
      setRoomState(prev => {
        if (!prev) return null;
        return { ...prev, playlist, playback };
      });
    });

    newSocket.on('video-changed', ({ playback }) => {
      setRoomState(prev => {
        if (!prev) return null;
        return { ...prev, playback };
      });
    });

    // Forced sync action from server
    newSocket.on('sync-state-forced', ({ playback }) => {
      setRoomState(prev => {
        if (!prev) return null;
        return { ...prev, playback };
      });
    });

    // Voice call state updates
    newSocket.on('voice-call-updated', ({ voiceCall }) => {
      setRoomState(prev => {
        if (!prev) return null;
        return { ...prev, voiceCall };
      });
    });

    // Stream events playback signals map
    newSocket.on('playback-command', ({ action, currentTime, playingVideoId }) => {
      setRoomState(prev => {
        if (!prev) return null;
        let nextStatus = prev.playback.status;
        if (action === 'play') {
          nextStatus = 'playing';
        } else if (action === 'pause') {
          nextStatus = 'paused';
        }
        return {
          ...prev,
          playback: {
            ...prev.playback,
            status: nextStatus,
            currentTime,
            lastUpdated: Date.now(),
            playingVideoId
          }
        };
      });
    });

    // Host Promotion Handler
    newSocket.on('host-promotion', ({ isHost: hStatus }) => {
      setIsHost(hStatus);
      showToast("🔴 You are now the host of this Room!");
    });

    // Error warnings
    newSocket.on('error-msg', (msg: string) => {
      showToast(`⚠️ ${msg}`);
    });

    return () => {
      newSocket.disconnect();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [roomId, userName]);

  // Host Action emitters
  const handleHostAddVideo = (youtubeId: string, title: string) => {
    if (!socket) return;
    socket.emit('add-video', { youtubeId, title });
  };

  const handleHostRemoveVideo = (itemId: string) => {
    if (!socket) return;
    socket.emit('remove-video', { itemId });
  };

  const handleHostReorderPlaylist = (playlist: any[]) => {
    if (!socket) return;
    socket.emit('reorder-playlist', { playlist });
  };

  const handleHostChangeVideo = (itemId: string) => {
    if (!socket) return;
    socket.emit('change-video', { itemId });
  };

  const handleHostPlay = (currentTime: number) => {
    if (!socket) return;
    socket.emit('play-video', { currentTime });
  };

  const handleHostPause = (currentTime: number) => {
    if (!socket) return;
    socket.emit('pause-video', { currentTime });
  };

  const handleHostSeek = (currentTime: number) => {
    if (!socket) return;
    socket.emit('seek-video', { currentTime });
  };

  const handleHostNextVideo = () => {
    if (!socket || !roomState || roomState.playlist.length === 0) return;
    
    // Find current index
    const currentIndex = roomState.playlist.findIndex(item => item.id === roomState.playback.playingVideoId);
    
    if (currentIndex !== -1 && currentIndex < roomState.playlist.length - 1) {
      // Roll forwards
      const nextItem = roomState.playlist[currentIndex + 1];
      socket.emit('change-video', { itemId: nextItem.id });
    } else {
      // Loop back to start
      const firstItem = roomState.playlist[0];
      socket.emit('change-video', { itemId: firstItem.id });
    }
  };

  // Participant Typing trigger Emitter
  const handleTypingState = (isTyping: boolean) => {
    if (!socket) return;
    socket.emit('user-typing', { isTyping });
  };

  // Chat message send
  const handleSendMessage = (text: string) => {
    if (!socket) return;
    socket.emit('send-message', { text });
  };

  // Resolve currently active playback video payload
  const currentPlaylistItem = roomState?.playlist.find(
    item => item.id === roomState.playback.playingVideoId
  ) || null;

  return (
    <div className="room-page min-h-screen flex flex-col relative selection:bg-blue-100">
      
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-slate-800 font-semibold text-sm px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header element */}
      <RoomHeader
        roomName={roomState?.name || 'TubeSync watching lounge'}
        roomId={roomId}
        userCount={roomState?.users.length || 1}
        isHost={isHost}
        onLeave={onLeave}
        onOpenInvite={() => {}}
      />

      {/* Main viewport grid layout */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="aspect-video w-full">
            {roomState && (
              <VideoPlayer
                socket={socket}
                currentPlaylistItem={currentPlaylistItem}
                playback={roomState.playback}
                isHost={isHost}
                onPlay={handleHostPlay}
                onPause={handleHostPause}
                onSeek={handleHostSeek}
                onNextVideo={handleHostNextVideo}
              />
            )}
          </div>

          {/* Voice Call Control and WebRTC Signal center */}
          {roomState && (
            <VoiceCallPanel
              socket={socket}
              roomState={roomState}
              selfId={selfId}
              isHost={isHost}
            />
          )}

          {/* Desktop ONLY: Chat panel sits underneath video player on Desktop view as spec says  */}
          {/* Layout: Desktop has Chat under video, Sidebar of Playlist + Viewers. */}
          {/* Mobile has Playlists/Chat tabs */}
          <div className="hidden lg:block">
            <ChatPanel
              chatHistory={chatHistory}
              typingUsers={typingUsers}
              selfId={selfId}
              onSendMessage={handleSendMessage}
              onTyping={handleTypingState}
            />
          </div>
        </div>

        <div className="lg:col-span-4 hidden lg:flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-[320px]">
            {roomState && (
              <PlaylistPanel
                playlist={roomState.playlist}
                playback={roomState.playback}
                isHost={isHost}
                onAddVideo={handleHostAddVideo}
                onRemoveVideo={handleHostRemoveVideo}
                onReorderPlaylist={handleHostReorderPlaylist}
                onChangeVideo={handleHostChangeVideo}
              />
            )}
          </div>
          <div className="h-[220px] shrink-0">
            {roomState && <UserList users={roomState.users} selfId={selfId} />}
          </div>
        </div>

        <div className="lg:hidden shrink-0 flex flex-col gap-4 room-soft-card bg-white border border-slate-100 p-3 rounded-2xl">
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl select-none">
            <button
              type="button"
              onClick={() => setActiveMobileTab('playlist')}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMobileTab === 'playlist'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <ListVideo className="w-3.5 h-3.5" />
              Playlist
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('chat')}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMobileTab === 'chat'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('viewers')}
              className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMobileTab === 'viewers'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Viewers
            </button>
          </div>

          <div className="min-h-[300px]">
            {activeMobileTab === 'playlist' && roomState && (
              <PlaylistPanel
                playlist={roomState.playlist}
                playback={roomState.playback}
                isHost={isHost}
                onAddVideo={handleHostAddVideo}
                onRemoveVideo={handleHostRemoveVideo}
                onReorderPlaylist={handleHostReorderPlaylist}
                onChangeVideo={handleHostChangeVideo}
              />
            )}
            
            {activeMobileTab === 'chat' && (
              <ChatPanel
                chatHistory={chatHistory}
                typingUsers={typingUsers}
                selfId={selfId}
                onSendMessage={handleSendMessage}
                onTyping={handleTypingState}
              />
            )}

            {activeMobileTab === 'viewers' && roomState && (
              <UserList users={roomState.users} selfId={selfId} />
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
