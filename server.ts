import express from "express";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import path from "node:path";
import dns from "node:dns";

// Setup DNS caching first to avoid timeouts with external oEmbed requests
dns.setDefaultResultOrder("ipv4first");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(express.json());

// In-memory store for rooms
// Key: Room ID, Value: RoomState
interface RoomStateInternal {
  roomId: string;
  name: string;
  isPublic: boolean;
  users: Array<{
    id: string; // Socket ID
    name: string;
    isHost: boolean;
    joinedAt: number;
  }>;
  playlist: Array<{
    id: string;
    youtubeId: string;
    title: string;
    duration?: number;
    addedBy: string;
  }>;
  playback: {
    status: 'playing' | 'paused' | 'stopped';
    currentTime: number;
    lastUpdated: number;
    playingVideoId: string | null; // Playlist Item Unique ID
  };
  chatHistory: Array<{
    id: string;
    userId: string;
    userName: string;
    isHost: boolean;
    text: string;
    timestamp: number;
    isSystem?: boolean;
  }>;
  typingUsers: Record<string, string>; // SocketId -> Name
  voiceCall: {
    active: boolean;
    startedAt: number | null;
    participants: string[];
  };
}

const rooms: Record<string, RoomStateInternal> = {};

// Helper to generate IDs
function generateRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// REST API
// Get active public rooms
app.get("/api/rooms", (req, res) => {
  const publicRooms = Object.values(rooms)
    .filter(r => r.isPublic)
    .map(r => ({
      roomId: r.roomId,
      name: r.name,
      userCount: r.users.length,
      currentVideoTitle: r.playlist.find(item => item.id === r.playback.playingVideoId)?.title || null
    }));
  res.json(publicRooms);
});

// Create a new room
app.post("/api/rooms", (req, res) => {
  const { name, isPublic } = req.body;
  const roomId = generateRoomId();
  
  rooms[roomId] = {
    roomId,
    name: name || "Interactive Watch Session",
    isPublic: !!isPublic,
    users: [],
    playlist: [],
    playback: {
      status: 'stopped',
      currentTime: 0,
      lastUpdated: Date.now(),
      playingVideoId: null
    },
    chatHistory: [],
    typingUsers: {},
    voiceCall: {
      active: false,
      startedAt: null,
      participants: []
    }
  };

  res.json({ roomId, success: true });
});

// Get detailed room info
app.get("/api/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json({
    roomId: room.roomId,
    name: room.name,
    isPublic: room.isPublic,
    userCount: room.users.length,
    exists: true
  });
});

// Resolve YouTube video details from URL/ID using oEmbed (to avoid API keys)
app.get("/api/youtube-info", async (req, res) => {
  const videoId = req.query.id as string;
  if (!videoId || videoId.length !== 11) {
    res.status(400).json({ error: "Invalid YouTube Video ID" });
    return;
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.title) {
        res.json({ title: data.title });
        return;
      }
    }
  } catch (error) {
    console.error("Error fetching oEmbed info", error);
  }
  res.json({ title: `YouTube Video (${videoId})` });
});

// Socket.IO Connection Setup
io.on("connection", (socket: Socket) => {
  let currentRoomId: string | null = null;
  let currentUserName: string | null = null;

  // 1. Join Room
  socket.on("join-room", ({ roomId, name }: { roomId: string; name: string }) => {
    // Standardize room ID to lowercase
    const cleanRoomId = roomId.trim().toLowerCase();
    const cleanName = name.trim().slice(0, 24) || `User_${socket.id.slice(0, 4)}`;

    currentRoomId = cleanRoomId;
    currentUserName = cleanName;

    // Check if room exists; if not, auto-create it (fallback for direct URL joins)
    if (!rooms[cleanRoomId]) {
      rooms[cleanRoomId] = {
        roomId: cleanRoomId,
        name: `Room ${cleanRoomId.toUpperCase()}`,
        isPublic: false,
        users: [],
        playlist: [],
        playback: {
          status: 'stopped',
          currentTime: 0,
          lastUpdated: Date.now(),
          playingVideoId: null
        },
        chatHistory: [],
        typingUsers: {},
        voiceCall: {
          active: false,
          startedAt: null,
          participants: []
        }
      };
    }

    const room = rooms[cleanRoomId];
    
    // Add user to the room state. First user is host.
    const isFirstUser = room.users.length === 0;
    const newUser = {
      id: socket.id,
      name: cleanName,
      isHost: isFirstUser,
      joinedAt: Date.now()
    };

    room.users.push(newUser);
    socket.join(cleanRoomId);

    // Create system notification message
    const joinMsg = {
      id: `${cleanRoomId}-join-${Date.now()}-${Math.random()}`,
      userId: "system",
      userName: "System",
      isHost: false,
      text: `${cleanName} joined the room.`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatHistory.push(joinMsg);
    if (room.chatHistory.length > 100) {
      room.chatHistory.shift();
    }

    // Dynamic sync of current time in playing state
    if (room.playback.status === 'playing') {
      const elapsedTime = (Date.now() - room.playback.lastUpdated) / 1000;
      room.playback.currentTime += elapsedTime;
      room.playback.lastUpdated = Date.now();
    }

    // Send complete init state to the newly joined client
    socket.emit("init-state", {
      room: {
        roomId: room.roomId,
        name: room.name,
        isPublic: room.isPublic,
        users: room.users,
        playlist: room.playlist,
        playback: room.playback,
        voiceCall: room.voiceCall
      },
      chatHistory: room.chatHistory,
      selfId: socket.id,
      isHost: newUser.isHost
    });

    // Notify all other clients in the room
    socket.to(cleanRoomId).emit("user-joined", {
      user: newUser,
      users: room.users
    });
    
    socket.to(cleanRoomId).emit("receive-message", joinMsg);
  });

  // 2. Add Video to Playlist
  socket.on("add-video", ({ youtubeId, title }: { youtubeId: string; title: string }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    // Authorize: Only host can manage playlist
    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) {
      socket.emit("error-msg", "Only the host can modify the playlist.");
      return;
    }

    const playlistItemId = `${youtubeId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem = {
      id: playlistItemId,
      youtubeId,
      title: title || `YouTube Video (${youtubeId})`,
      addedBy: user.name
    };

    room.playlist.push(newItem);

    // If playlist was previously empty, automatically set currently playing item
    if (room.playlist.length === 1 || !room.playback.playingVideoId) {
      room.playback.playingVideoId = playlistItemId;
      room.playback.status = 'playing';
      room.playback.currentTime = 0;
      room.playback.lastUpdated = Date.now();
    }

    // Broadcast updated playlist
    io.to(currentRoomId).emit("playlist-updated", {
      playlist: room.playlist,
      playback: room.playback
    });

    // Send system message
    const msg = {
      id: `${currentRoomId}-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: "system",
      userName: "System",
      isHost: false,
      text: `Host added "${newItem.title}" to the playlist.`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatHistory.push(msg);
    io.to(currentRoomId).emit("receive-message", msg);
  });

  // 3. Remove Video from Playlist
  socket.on("remove-video", ({ itemId }: { itemId: string }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) {
      socket.emit("error-msg", "Only the host can modify the playlist.");
      return;
    }

    const itemIndex = room.playlist.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    const removedItem = room.playlist[itemIndex];
    room.playlist.splice(itemIndex, 1);

    // Handle deletion of currently playing video
    if (room.playback.playingVideoId === itemId) {
      if (room.playlist.length > 0) {
        // Fallback to the next video (which sits at itemIndex, or itemIndex-1 if at the end)
        const nextIndex = Math.min(itemIndex, room.playlist.length - 1);
        room.playback.playingVideoId = room.playlist[nextIndex].id;
      } else {
        room.playback.playingVideoId = null;
      }
      room.playback.status = 'stopped';
      room.playback.currentTime = 0;
      room.playback.lastUpdated = Date.now();
    }

    io.to(currentRoomId).emit("playlist-updated", {
      playlist: room.playlist,
      playback: room.playback
    });

    const msg = {
      id: `${currentRoomId}-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: "system",
      userName: "System",
      isHost: false,
      text: `Removed "${removedItem.title}" from playlist.`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatHistory.push(msg);
    io.to(currentRoomId).emit("receive-message", msg);
  });

  // 4. Reorder Playlist
  socket.on("reorder-playlist", ({ playlist }: { playlist: Array<any> }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) return;

    room.playlist = playlist;
    
    // Validate currently playing video index or reference
    const currentStillExists = room.playlist.some(item => item.id === room.playback.playingVideoId);
    if (!currentStillExists && room.playlist.length > 0) {
      room.playback.playingVideoId = room.playlist[0].id;
      room.playback.status = 'stopped';
      room.playback.currentTime = 0;
      room.playback.lastUpdated = Date.now();
    }

    io.to(currentRoomId).emit("playlist-updated", {
      playlist: room.playlist,
      playback: room.playback
    });
  });

  // 5. Change Current Video State (select specific video)
  socket.on("change-video", ({ itemId }: { itemId: string }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) return;

    const item = room.playlist.find(p => p.id === itemId);
    if (!item) return;

    room.playback.playingVideoId = itemId;
    room.playback.status = 'playing';
    room.playback.currentTime = 0;
    room.playback.lastUpdated = Date.now();

    io.to(currentRoomId).emit("video-changed", {
      playback: room.playback
    });

    const msg = {
      id: `${currentRoomId}-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: "system",
      userName: "System",
      isHost: false,
      text: `Host changed view to "${item.title}".`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatHistory.push(msg);
    io.to(currentRoomId).emit("receive-message", msg);
  });

  // 6. Playback Sync Actions
  socket.on("play-video", ({ currentTime }: { currentTime: number }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) return; // Only host controls playback

    room.playback.status = 'playing';
    room.playback.currentTime = currentTime;
    room.playback.lastUpdated = Date.now();

    // Broadcast play event to all users
    io.to(currentRoomId).emit("playback-command", {
      action: "play",
      currentTime,
      playingVideoId: room.playback.playingVideoId
    });
  });

  socket.on("pause-video", ({ currentTime }: { currentTime: number }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) return;

    room.playback.status = 'paused';
    room.playback.currentTime = currentTime;
    room.playback.lastUpdated = Date.now();

    // Broadcast pause event to all users
    io.to(currentRoomId).emit("playback-command", {
      action: "pause",
      currentTime,
      playingVideoId: room.playback.playingVideoId
    });
  });

  socket.on("seek-video", ({ currentTime }: { currentTime: number }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) return;

    room.playback.currentTime = currentTime;
    room.playback.lastUpdated = Date.now();

    // Broadcast seek event to all users
    io.to(currentRoomId).emit("playback-command", {
      action: "seek",
      currentTime,
      playingVideoId: room.playback.playingVideoId
    });
  });

  // Periodic state broadcast for user sync / reconnects (fallback safety)
  socket.on("sync-state", ({ state }: { state: any }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) return; // Only host pushes state truth updates

    room.playback.currentTime = state.currentTime;
    room.playback.status = state.status;
    room.playback.lastUpdated = Date.now();

    socket.to(currentRoomId).emit("sync-state-forced", {
      playback: room.playback
    });
  });

  // 6.5 Voice Call Control and WebRTC Signaling
  socket.on("start-voice-call", () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) {
      socket.emit("error-msg", "Only the host can start a voice call.");
      return;
    }

    room.voiceCall = {
      active: true,
      startedAt: Date.now(),
      participants: [socket.id] // Host auto-joins on start
    };

    io.to(currentRoomId).emit("voice-call-updated", {
      voiceCall: room.voiceCall
    });

    const systemMsg = {
      id: `system-voice-start-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: "system",
      userName: "System",
      isHost: false,
      text: `🎙️ Host started a room voice call. Option to join is now active!`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatHistory.push(systemMsg);
    io.to(currentRoomId).emit("receive-message", systemMsg);
  });

  socket.on("end-voice-call", () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user || !user.isHost) {
      socket.emit("error-msg", "Only the host can end the voice call.");
      return;
    }

    room.voiceCall = {
      active: false,
      startedAt: null,
      participants: []
    };

    io.to(currentRoomId).emit("voice-call-updated", {
      voiceCall: room.voiceCall
    });

    const systemMsg = {
      id: `system-voice-end-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: "system",
      userName: "System",
      isHost: false,
      text: `🎙️ The host ended the voice call.`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatHistory.push(systemMsg);
    io.to(currentRoomId).emit("receive-message", systemMsg);
  });

  socket.on("join-voice-call", () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    if (!room.voiceCall || !room.voiceCall.active) {
      socket.emit("error-msg", "There is no active voice call to join.");
      return;
    }

    if (!room.voiceCall.participants.includes(socket.id)) {
      room.voiceCall.participants.push(socket.id);
    }

    io.to(currentRoomId).emit("voice-call-updated", {
      voiceCall: room.voiceCall
    });

    // Notify others so peers can initiate WebRTC handshakes
    socket.to(currentRoomId).emit("voice-call-peer-joined", {
      userId: socket.id
    });
  });

  socket.on("leave-voice-call", () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    if (room.voiceCall && room.voiceCall.participants.includes(socket.id)) {
      room.voiceCall.participants = room.voiceCall.participants.filter(id => id !== socket.id);

      io.to(currentRoomId).emit("voice-call-updated", {
        voiceCall: room.voiceCall
      });

      socket.to(currentRoomId).emit("voice-call-peer-left", {
        userId: socket.id
      });
    }
  });

  socket.on("webrtc-signal", ({ targetId, signal }: { targetId: string; signal: any }) => {
    io.to(targetId).emit("webrtc-signal", {
      senderId: socket.id,
      signal
    });
  });

  // 7. Chat Messages
  socket.on("send-message", ({ text }: { text: string }) => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    const user = room.users.find(u => u.id === socket.id);
    if (!user) return;

    const messagePayload = {
      id: `chat-${Date.now()}-${Math.random()}`,
      userId: socket.id,
      userName: user.name,
      isHost: user.isHost,
      text: text.slice(0, 500),
      timestamp: Date.now()
    };

    room.chatHistory.push(messagePayload);
    if (room.chatHistory.length > 100) {
      room.chatHistory.shift();
    }

    io.to(currentRoomId).emit("receive-message", messagePayload);
  });

  // 8. Typing Indicators
  socket.on("user-typing", ({ isTyping }: { isTyping: boolean }) => {
    if (!currentRoomId || !rooms[currentRoomId] || !currentUserName) return;
    const room = rooms[currentRoomId];

    if (isTyping) {
      room.typingUsers[socket.id] = currentUserName;
    } else {
      delete room.typingUsers[socket.id];
    }

    socket.to(currentRoomId).emit("typing-updated", {
      typingUsers: Object.values(room.typingUsers)
    });
  });

  // 9. Leave / Disconnect
  const handleLeave = () => {
    if (!currentRoomId || !rooms[currentRoomId]) return;
    const room = rooms[currentRoomId];

    // Remove user
    const userIndex = room.users.findIndex(u => u.id === socket.id);
    if (userIndex !== -1) {
      const leavingUser = room.users[userIndex];
      room.users.splice(userIndex, 1);
      
      // Clean up typing
      delete room.typingUsers[socket.id];
      socket.to(currentRoomId).emit("typing-updated", {
        typingUsers: Object.values(room.typingUsers)
      });

      // Clean up voice call connection
      if (room.voiceCall && room.voiceCall.participants.includes(socket.id)) {
        room.voiceCall.participants = room.voiceCall.participants.filter(id => id !== socket.id);
        socket.to(currentRoomId).emit("voice-call-updated", {
          voiceCall: room.voiceCall
        });
        socket.to(currentRoomId).emit("voice-call-peer-left", {
          userId: socket.id
        });
      }

      // System notification
      const leaveMsg = {
        id: `${currentRoomId}-leave-${Date.now()}-${Math.random()}`,
        userId: "system",
        userName: "System",
        isHost: false,
        text: `${leavingUser.name} left the room.`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.chatHistory.push(leaveMsg);
      if (room.chatHistory.length > 100) {
        room.chatHistory.shift();
      }

      socket.to(currentRoomId).emit("receive-message", leaveMsg);

      // Host rotation: if host left, choose next user with early joinedAt
      if (leavingUser.isHost && room.users.length > 0) {
        // Find user that joined first (earliest joinedAt)
        room.users.sort((a, b) => a.joinedAt - b.joinedAt);
        room.users[0].isHost = true;

        const hostPromoMsg = {
          id: `${currentRoomId}-host-promo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          userId: "system",
          userName: "System",
          isHost: false,
          text: `Host left. ${room.users[0].name} has been promoted to Host!`,
          timestamp: Date.now(),
          isSystem: true
        };
        room.chatHistory.push(hostPromoMsg);
        io.to(currentRoomId).emit("receive-message", hostPromoMsg);
        
        // Notify promoted socket they are host
        io.to(room.users[0].id).emit("host-promotion", { isHost: true });
      }

      // If room is empty, clear it after 1 minute of inactivity
      if (room.users.length === 0) {
        setTimeout(() => {
          if (rooms[currentRoomId!] && rooms[currentRoomId!].users.length === 0) {
            delete rooms[currentRoomId!];
            console.log(`Cleaned up empty room ${currentRoomId}`);
          }
        }, 60000);
      }

      socket.to(currentRoomId).emit("user-left", {
        userId: socket.id,
        users: room.users
      });
    }
  };

  socket.on("leave-room", handleLeave);
  socket.on("disconnect", handleLeave);
});

// Setup Vite development rendering or static production serving
async function configureVite() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const { createServer: createViteServer } = await import("vite");
    const viteInstance = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(viteInstance.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start HTTP / Socket Server
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`TubeSync running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

configureVite().catch(err => {
  console.error("Vite setup error:", err);
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Falling back to static runtime. Server running on port ${PORT}`);
  });
});
