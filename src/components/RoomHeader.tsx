import React, { useState } from 'react';
import { Share2, LogOut, Check, Users, Tv, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoomHeaderProps {
  roomName: string;
  roomId: string;
  userCount: number;
  isHost: boolean;
  onLeave: () => void;
  onOpenInvite: () => void;
}

export default function RoomHeader({
  roomName,
  roomId,
  userCount,
  isHost,
  onLeave,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/?room=${roomId}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <header
      id="room-navbar"
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
            <Tv className="w-[18px] h-[18px] text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 id="header-room-title" className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                {roomName}
              </h1>
              <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-wider font-bold shrink-0">
                {roomId}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Users className="w-3 h-3" />
                {userCount} {userCount === 1 ? 'watcher' : 'watchers'}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sync on
              </span>
              {isHost && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-md border border-amber-100 font-bold">
                  <Crown className="w-2.5 h-2.5" />
                  Host
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-copy-invite-link"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-emerald-600"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Copied!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Share Invite</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            id="btn-leave-room"
            onClick={onLeave}
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 px-3 sm:px-4 py-2 rounded-xl transition-all cursor-pointer"
            title="Leave Room"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </header>
  );
}
