import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, Smile, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  typingUsers: string[];
  selfId: string;
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export default function ChatPanel({
  chatHistory,
  typingUsers,
  selfId,
  onSendMessage,
  onTyping
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const quickEmojis = ['👋', '🔥', '😆', '👍', '😮', '❤️', '🍿', '🎬'];

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [chatHistory, typingUsers]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText) return;

    onSendMessage(cleanText);
    setInputText('');
    onTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (value.trim()) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 3000);
    } else {
      onTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="room-soft-card bg-white border border-slate-100 rounded-2xl p-4 flex flex-col h-[400px] lg:h-[420px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-500 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </span>
          Live Chat
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </h2>
        <span className="text-[11px] text-slate-400 font-medium">Keep it friendly!</span>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {chatHistory.map((msg) => {
          if (msg.isSystem) {
            return (
              <div
                key={msg.id}
                className="flex items-center justify-center text-center py-1.5 px-3 bg-slate-50 rounded-xl text-slate-500 text-xs border border-slate-100 font-medium max-w-[90%] mx-auto"
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                <span>{msg.text}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-2">{formatTime(msg.timestamp)}</span>
              </div>
            );
          }

          const isSelf = msg.userId === selfId;

          return (
            <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-bold ${isSelf ? 'text-blue-600' : 'text-slate-700'}`}>
                  {msg.userName}
                </span>
                {msg.isHost && (
                  <span className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-px rounded font-bold border border-amber-100">
                    HOST
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">{formatTime(msg.timestamp)}</span>
              </div>
              <div
                className={`px-3.5 py-2 rounded-2xl text-sm max-w-[85%] break-words ${
                  isSelf
                    ? 'bg-blue-500 text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-800 border border-slate-100 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 py-2 shrink-0 overflow-x-auto border-t border-slate-50">
        <Smile className="w-4 h-4 text-slate-400 mr-0.5 shrink-0" />
        {quickEmojis.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleAddEmoji(emoji)}
            className="text-sm p-1 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-all shrink-0 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="h-5 shrink-0 flex items-center px-1 text-xs text-slate-500 font-medium">
        {typingUsers.length > 0 && (
          <span className="flex items-center gap-1.5 animate-pulse">
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.join(', ')} are typing...`}
          </span>
        )}
      </div>

      <form
        id="chat-send-form"
        onSubmit={handleSend}
        className="flex items-center gap-2 shrink-0 border border-slate-200 hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 rounded-xl p-1.5 bg-slate-50 transition-all"
      >
        <input
          id="chat-input-text"
          type="text"
          placeholder="Send a message..."
          value={inputText}
          onChange={handleChange}
          maxLength={500}
          className="flex-1 bg-transparent px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <button
          id="btn-chat-send"
          type="submit"
          disabled={!inputText.trim()}
          className="room-btn-primary disabled:opacity-40 disabled:shadow-none text-white p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
