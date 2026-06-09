import React, { useEffect, useRef, useState } from 'react';
import { Tv, Maximize, Minimize, Play } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { PlaylistItem, PlaybackState } from '../types';
import { loadYouTubeAPI } from '../utils/youtube';

interface VideoPlayerProps {
  socket: Socket | null;
  currentPlaylistItem: PlaylistItem | null;
  playback: PlaybackState;
  isHost: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onNextVideo: () => void;
}

export default function VideoPlayer({
  socket,
  currentPlaylistItem,
  playback,
  isHost,
  onPlay,
  onPause,
  onSeek,
  onNextVideo
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(!isHost);
  
  const blockUpdateRef = useRef(false); // Guard to prevent state feedback loops
  const lastTimeRef = useRef(0);
  const syncCounterRef = useRef(0);
  const pauseTimeoutRef = useRef<any>(null);

  // Sync isMuted state if host status changes
  useEffect(() => {
    setIsMuted(!isHost);
  }, [isHost]);

  // Comprehensive responsive-proof fullscreen handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    const doc = document as any;
    const el = containerRef.current as any;
    
    if (!isFullscreen) {
      // Direct Webkit, Moz, MS, and Standard Fullscreen prefixes
      const requestMethod = el.requestFullscreen || 
                            el.webkitRequestFullscreen || 
                            el.mozRequestFullScreen || 
                            el.msRequestFullscreen;
      if (requestMethod) {
        requestMethod.call(el)
          .then(() => setIsFullscreen(true))
          .catch((err: any) => {
            console.log("Native fullscreen browser limit hit. Using CSS fallback.", err);
            setIsFullscreen(true);
          });
      } else {
        // Direct CSS-simulated fallback for iOS safari / iPhones
        setIsFullscreen(true);
      }
    } else {
      const exitMethod = doc.exitFullscreen || 
                         doc.webkitExitFullscreen || 
                         doc.mozCancelFullScreen || 
                         doc.msExitFullscreen;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
        if (exitMethod) {
          try {
            exitMethod.call(doc);
          } catch (e) {
            console.error(e);
          }
        }
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const nativeActive = !!(doc.fullscreenElement || 
                              doc.webkitFullscreenElement || 
                              doc.mozFullScreenElement || 
                              doc.msFullscreenElement);
      if (!nativeActive && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // 1. Load YT API & Initialize Player
  useEffect(() => {
    let active = true;
    loadYouTubeAPI(() => {
      if (!active || playerRef.current || !containerRef.current) return;

      const videoId = currentPlaylistItem?.youtubeId || '';
      
      const p = new window.YT.Player('yt-iframe-container', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: isHost ? 1 : 0, // YouTube default controls only for hosts
          mute: isHost ? 0 : 1,     // Muted startup for participants to bypass mobile autoplay blocks!
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: isHost ? 0 : 1, // Minimize keys interference for participants
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (!active) return;
            playerRef.current = event.target;
            setPlayerReady(true);
            if (isHost) {
              event.target.setVolume(50);
            }
          },
          onStateChange: (event: any) => {
            if (!active) return;
            const state = event.data;
            
            // YT.PlayerState
            // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED, -1: UNSTARTED
            if (state === 1) {
              setIsPlaying(true);
              if (pauseTimeoutRef.current) {
                clearTimeout(pauseTimeoutRef.current);
                pauseTimeoutRef.current = null;
              }
              if (isHost && !blockUpdateRef.current) {
                onPlay(event.target.getCurrentTime() || 0);
              }
            } else if (state === 2) {
              setIsPlaying(false);
              if (isHost && !blockUpdateRef.current) {
                // Debounce host-side pauses by 400ms to ignore short pauses during manual seek dragging/scrubbing
                if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
                pauseTimeoutRef.current = setTimeout(() => {
                  if (playerRef.current && playerRef.current.getPlayerState() === 2) {
                    onPause(playerRef.current.getCurrentTime() || 0);
                  }
                }, 400);
              }
            } else if (state === 0) {
              setIsPlaying(false);
              if (isHost) {
                onNextVideo();
              }
            }
          }
        }
      });
    });

    return () => {
      active = false;
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
          setPlayerReady(false);
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [isHost]);

  // 2. Respond to Playlist Video / Track changes
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;

    try {
      if (!currentPlaylistItem) {
        // Stop playing video immediately when empty or deleted
        playerRef.current.stopVideo();
        setIsPlaying(false);
        return;
      }

      const currentLoadedUrl = playerRef.current.getVideoUrl ? playerRef.current.getVideoUrl() : "";
      const yid = currentPlaylistItem.youtubeId;
      
      if (!currentLoadedUrl.includes(yid)) {
        blockUpdateRef.current = true;
        playerRef.current.loadVideoById({
          videoId: yid,
          startSeconds: playback.currentTime || 0
        });
        setTimeout(() => {
          blockUpdateRef.current = false;
        }, 1200);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentPlaylistItem?.id, playerReady]);

  // 3. Respond to Remote Playback Sync Signals from host
  useEffect(() => {
    if (!playerReady || !playerRef.current || blockUpdateRef.current) return;

    if (isHost) return;

    const isPlayerPlaying = isPlaying;
    const isStatePlaying = playback.status === 'playing';

    // Synchronize play/pause states
    if (isStatePlaying && !isPlayerPlaying) {
      blockUpdateRef.current = true;
      playerRef.current.playVideo();
      setTimeout(() => { blockUpdateRef.current = false; }, 800);
    } else if (!isStatePlaying && isPlayerPlaying) {
      blockUpdateRef.current = true;
      playerRef.current.pauseVideo();
      setTimeout(() => { blockUpdateRef.current = false; }, 800);
    }

    // Synchronize timestamps if they drift too much (or direct on-seek events)
    try {
      const playerTime = playerRef.current.getCurrentTime();
      const diff = Math.abs(playerTime - playback.currentTime);
      if (diff > 2.5) {
        blockUpdateRef.current = true;
        playerRef.current.seekTo(playback.currentTime, true);
        if (isStatePlaying) {
          playerRef.current.playVideo();
        }
        setTimeout(() => { blockUpdateRef.current = false; }, 800);
      }
    } catch (e) {
      console.error(e);
    }
  }, [playback.status, playback.currentTime, playback.lastUpdated, playerReady, isHost]);

  // 4. Timer Tick to maintain high-precision alignment and detect drifts
  useEffect(() => {
    const timer = setInterval(() => {
      if (!playerReady || !playerRef.current) return;

      try {
        const time = playerRef.current.getCurrentTime() || 0;
        
        if (isHost) {
          // Detect manual seeks on the native YouTube trackbar by comparing time delta
          const diff = Math.abs(time - lastTimeRef.current);
          if (diff > 2.5 && !blockUpdateRef.current && lastTimeRef.current !== 0) {
            onSeek(time);
          }
          
          if (isPlaying) {
            playback.currentTime = time;
          }

          // Periodic sync-state to backend (every 5 seconds) to maintain a durable source-of-truth clock
          syncCounterRef.current = (syncCounterRef.current || 0) + 1;
          if (syncCounterRef.current >= 5) {
            syncCounterRef.current = 0;
            if (socket) {
              socket.emit('sync-state', {
                state: {
                  currentTime: time,
                  status: isPlaying ? 'playing' : 'paused'
                }
              });
            }
          }
        } else {
          // Participant tracking: automatically correct if player drifts apart from host state
          if (playback.status === 'playing' && !blockUpdateRef.current) {
            const expectedDiff = (Date.now() - playback.lastUpdated) / 1000;
            const targetTime = playback.currentTime + expectedDiff;
            const currentDiff = Math.abs(time - targetTime);

            if (currentDiff > 3) {
              blockUpdateRef.current = true;
              playerRef.current.seekTo(targetTime, true);
              playerRef.current.playVideo();
              setTimeout(() => { blockUpdateRef.current = false; }, 800);
            }
          }
        }
        
        lastTimeRef.current = time;
      } catch (err) {
        console.error(err);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [playerReady, isHost, isPlaying, playback, socket]);

  // Click handler to manually unmute and restore perfect live sync on devices
  const handleParticipantClick = () => {
    if (!playerReady || !playerRef.current) return;
    try {
      blockUpdateRef.current = true;
      playerRef.current.unMute();
      playerRef.current.setVolume(50);
      playerRef.current.playVideo();
      setIsMuted(false);
      
      const expectedDiff = (Date.now() - playback.lastUpdated) / 1000;
      const targetTime = playback.status === 'playing' ? (playback.currentTime + expectedDiff) : playback.currentTime;
      playerRef.current.seekTo(targetTime, true);
      
      setTimeout(() => {
        blockUpdateRef.current = false;
        setIsPlaying(true);
      }, 800);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div 
      ref={containerRef} 
      onDoubleClick={toggleFullscreen}
      className={`transition-all duration-300 flex flex-col justify-center relative w-full overflow-hidden select-none ${
        isFullscreen 
          ? "fixed inset-0 z-[9999] w-screen h-screen bg-black rounded-none border-none pointer-events-auto" 
          : "room-soft-card bg-white border border-slate-100 flex-1 rounded-2xl h-full"
      }`}
    >
      <div className={`relative w-full bg-slate-100 flex-1 flex items-center justify-center overflow-hidden ${
        isFullscreen 
          ? "h-full w-full bg-black" 
          : "aspect-video min-h-[220px] md:min-h-[340px] rounded-2xl"
      }`}>
        
        {/* Core iframe target */}
        <div id="yt-iframe-container" className="absolute inset-0 w-full h-full z-0 overflow-hidden animate-fade-in" />

        {/* Participant shield to block hover/clicks, and to unmute */}
        {!isHost && (
          <div 
            onClick={isMuted ? handleParticipantClick : (e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-all duration-300 ${
              isMuted 
                ? "bg-white/60 backdrop-blur-sm cursor-pointer pointer-events-auto" 
                : "pointer-events-auto cursor-default"
            }`}
            style={!isMuted ? { backgroundColor: 'rgba(0, 0, 0, 0.001)' } : undefined}
            title={isMuted ? "Tap to unmute & play" : ""}
          >
            {isMuted && currentPlaylistItem && (
              <div className="flex flex-col items-center gap-3 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl max-w-[280px] text-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                  <Play className="w-6 h-6 fill-current translate-x-0.5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Join Live Stream</h4>
                  <p className="text-slate-500 text-[11px] mt-1 font-medium leading-relaxed">
                    Tap anywhere to synchronize live audio & video with the room.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Elegant Floating Custom Fullscreen Trigger Button */}
        {currentPlaylistItem && (
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="bg-white/90 hover:bg-white text-slate-700 p-2 md:p-2.5 rounded-xl border border-slate-200/80 backdrop-blur-md cursor-pointer transition-all active:scale-95 shadow-lg group flex items-center justify-center pointer-events-auto"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 group-hover:scale-110 transition-transform" />
              ) : (
                <Maximize className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>
        )}

        {/* Empty Video State */}
        {!currentPlaylistItem && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 overflow-hidden">
            <img
              src="/images/hero/cinema-main.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px]" />
            <div className="relative z-10 flex flex-col items-center max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/25">
                <Tv className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">No active broadcast</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed font-medium">
                {isHost
                  ? 'Add YouTube links to the shared playlist to start the watch party.'
                  : 'Waiting for the host to queue a video — hang tight!'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
