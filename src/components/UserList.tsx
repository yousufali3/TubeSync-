import React from 'react';
import { Users, Crown } from 'lucide-react';
import { User } from '../types';

interface UserListProps {
  users: User[];
  selfId: string;
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-rose-100 text-rose-700 border-rose-200',
];

export default function UserList({ users, selfId }: UserListProps) {
  return (
    <div className="room-soft-card bg-white border border-slate-100 rounded-2xl p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 shrink-0">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </span>
          Active Viewers
          <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-1.5 py-0.5 rounded-md font-bold">
            {users.length}
          </span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] md:max-h-none">
        {users.map((user, i) => {
          const isSelf = user.id === selfId;
          const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];

          return (
            <div
              key={user.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isSelf
                  ? 'bg-blue-50/60 border-blue-100'
                  : 'bg-slate-50/50 border-slate-100/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                    user.isHost ? 'bg-amber-100 text-amber-700 border-amber-200' : colorClass
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate text-sm font-semibold text-slate-700">
                  {user.name}
                  {isSelf && <span className="text-xs text-blue-500 font-medium ml-1">(You)</span>}
                </div>
              </div>

              {user.isHost && (
                <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border border-amber-100 shrink-0">
                  <Crown className="w-2.5 h-2.5" />
                  HOST
                </span>
              )}
            </div>
          );
        })}
        {users.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">No viewers in room.</div>
        )}
      </div>
    </div>
  );
}
