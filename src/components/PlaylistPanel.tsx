import React, { useState } from 'react';
import { Plus, Trash, ArrowUp, ArrowDown, Play, Youtube, Radio, ListMusic } from 'lucide-react';
import { PlaylistItem, PlaybackState } from '../types';
import { extractYouTubeId } from '../utils/youtube';

interface PlaylistPanelProps {
  playlist: PlaylistItem[];
  playback: PlaybackState;
  isHost: boolean;
  onAddVideo: (youtubeId: string, title: string) => void;
  onRemoveVideo: (itemId: string) => void;
  onReorderPlaylist: (newPlaylist: PlaylistItem[]) => void;
  onChangeVideo: (itemId: string) => void;
}

export default function PlaylistPanel({
  playlist,
  playback,
  isHost,
  onAddVideo,
  onRemoveVideo,
  onReorderPlaylist,
  onChangeVideo
}: PlaylistPanelProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tryAutoAdd = async (url: string) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return false;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/youtube-info?id=${videoId}`);
      let title = `YouTube Video (${videoId})`;
      if (res.ok) {
        const data = await res.json();
        title = data.title || title;
      }
      onAddVideo(videoId, title);
      setInputUrl('');
    } catch (err) {
      console.error(err);
      onAddVideo(videoId, `YouTube Video (${videoId})`);
      setInputUrl('');
    } finally {
      setIsLoading(false);
    }
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputUrl(val);

    const trimmed = val.trim();
    const isUrl = trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('watch?v=') || trimmed.length === 11;
    if (isUrl) {
      const parsed = extractYouTubeId(trimmed);
      if (parsed) tryAutoAdd(trimmed);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      const parsed = extractYouTubeId(pastedText);
      if (parsed) {
        e.preventDefault();
        tryAutoAdd(pastedText);
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanUrl = inputUrl.trim();
    if (!cleanUrl) return;

    const added = await tryAutoAdd(cleanUrl);
    if (!added) setErrorMsg('Invalid YouTube URL or Video ID');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!isHost) return;
    const newPlaylist = [...playlist];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playlist.length) return;

    const temp = newPlaylist[index];
    newPlaylist[index] = newPlaylist[targetIndex];
    newPlaylist[targetIndex] = temp;
    onReorderPlaylist(newPlaylist);
  };

  return (
    <div className="room-soft-card bg-white border border-slate-100 rounded-2xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 shrink-0">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
            <ListMusic className="w-3.5 h-3.5" />
          </span>
          Shared Playlist
          <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-1.5 py-0.5 rounded-md font-bold">
            {playlist.length}
          </span>
        </h2>
        {isHost && (
          <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-lg border border-blue-100 font-bold">
            HOST
          </span>
        )}
      </div>

      {isHost ? (
        <form onSubmit={handleAddSubmit} className="mb-4 shrink-0">
          <div className="flex gap-2">
            <input
              id="input-youtube-url"
              type="text"
              placeholder="Paste YouTube Link or Video ID"
              value={inputUrl}
              onChange={handleInputChange}
              onPaste={handlePaste}
              disabled={isLoading}
              className="room-input flex-1 text-xs font-medium placeholder-slate-400 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 transition-all outline-none"
            />
            <button
              id="btn-add-to-playlist"
              type="submit"
              disabled={isLoading || !inputUrl.trim()}
              className="room-btn-primary disabled:opacity-40 text-white text-xs font-bold px-4 rounded-xl flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add
            </button>
          </div>
          {errorMsg && (
            <p className="text-[10px] font-semibold text-red-500 mt-1.5 px-1">{errorMsg}</p>
          )}
        </form>
      ) : (
        <div className="mb-4 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center shrink-0">
          <p className="text-xs text-slate-500 font-medium">Host manages the playlist queue</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] md:max-h-none">
        {playlist.map((item, index) => {
          const isCurrentlyPlaying = playback.playingVideoId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => {
                if (isHost && !isCurrentlyPlaying) onChangeVideo(item.id);
              }}
              className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                isCurrentlyPlaying
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100'
                  : isHost
                    ? 'bg-white hover:bg-slate-50 border-slate-100 cursor-pointer'
                    : 'bg-white border-slate-100'
              }`}
            >
              <div className="relative shrink-0 w-[72px] aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-100">
                <img
                  src={`https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {isCurrentlyPlaying && (
                  <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-white animate-pulse" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`text-xs font-bold leading-snug line-clamp-2 ${isCurrentlyPlaying ? 'text-blue-800' : 'text-slate-800'}`}>
                  {item.title}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">by {item.addedBy}</p>
              </div>

              {isHost && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {!isCurrentlyPlaying && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onChangeVideo(item.id); }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                      title="Play Video"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveItem(index, 'up'); }}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-20 rounded-lg cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveItem(index, 'down'); }}
                    disabled={index === playlist.length - 1}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-20 rounded-lg cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveVideo(item.id); }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Remove Video"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {playlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-xl text-center">
            <Youtube className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">Playlist is empty</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-relaxed">
              {isHost ? 'Paste a video URL above to enqueue a track!' : 'Waiting for host to add tracks.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
