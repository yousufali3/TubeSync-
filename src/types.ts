export interface User {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

export interface PlaylistItem {
  id: string; // Unique ID to distinguish duplicate references to the same video in a playlist
  youtubeId: string;
  title: string;
  duration?: number;
  addedBy: string;
}

export interface PlaybackState {
  status: 'playing' | 'paused' | 'stopped';
  currentTime: number; // in seconds
  lastUpdated: number; // timestamp in ms of state change
  playingVideoId: string | null; // playlists items unique ID, or null
}

export interface VoiceCallState {
  active: boolean;
  startedAt: number | null;
  participants: string[]; // List of user IDs participating in the call
}

export interface RoomState {
  roomId: string;
  name: string;
  isPublic: boolean;
  users: User[];
  playlist: PlaylistItem[];
  playback: PlaybackState;
  voiceCall?: VoiceCallState;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  isHost: boolean;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
}
