import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import RoomPage from './components/RoomPage';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [invitedRoomId, setInvitedRoomId] = useState<string | undefined>(undefined);

  // Parse invite parameters in URL query on initialization
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInvitedRoomId(roomParam.toLowerCase().trim());
    }
  }, []);

  const handleJoin = (targetRoomId: string, name: string) => {
    const cleanRoomId = targetRoomId.toLowerCase().trim();
    setUserName(name);
    setRoomId(cleanRoomId);
    
    // Seamless url update so users can copy the direct URL in browser search bar
    const newUrl = `${window.location.origin}/?room=${cleanRoomId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleCreate = async (roomName: string, isPublic: boolean, creatorName: string) => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: roomName, isPublic })
      });
      if (response.ok) {
        const data = await response.json();
        handleJoin(data.roomId, creatorName);
      } else {
        throw new Error('Room creation failed');
      }
    } catch (err) {
      console.error("Error creating room:", err);
      // Graceful local generation fallback
      const randomRoomId = Math.random().toString(36).substring(2, 8);
      handleJoin(randomRoomId, creatorName);
    }
  };

  const handleLeave = () => {
    setRoomId(null);
    setUserName(null);
    setInvitedRoomId(undefined);
    
    // Clear invite parameter query on exit
    const cleanUrl = window.location.origin;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
  };

  if (roomId && userName) {
    return (
      <RoomPage
        roomId={roomId}
        userName={userName}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <LandingPage
      onJoinRoom={handleJoin}
      onCreateRoom={handleCreate}
      initialRoomId={invitedRoomId}
    />
  );
}
