import React, { useState, useEffect } from 'react';
import {
  Tv, Play, Plus, Users, ArrowRight, Video, CheckCircle, Radio,
  MessageSquare, ListMusic, RefreshCw, ChevronDown, Zap, BarChart3, Globe, Mic, Phone
} from 'lucide-react';

interface PublicRoom {
  roomId: string;
  name: string;
  userCount: number;
  currentVideoTitle: string | null;
}

interface LandingPageProps {
  onJoinRoom: (roomId: string, name: string) => void;
  onCreateRoom: (roomName: string, isPublic: boolean, creatorName: string) => void;
  initialRoomId?: string;
}

const FEATURES = [
  {
    icon: CheckCircle,
    color: 'bg-orange-50 text-orange-500',
    title: 'No Signup Required',
    desc: 'Join or create instantly with a shareable room link — no accounts, no friction.',
  },
  {
    icon: BarChart3,
    color: 'bg-blue-50 text-blue-500',
    title: 'Millisecond Sync',
    desc: 'Playback stays locked across every viewer so nobody falls behind the stream.',
  },
  {
    icon: Radio,
    color: 'bg-violet-50 text-violet-500',
    title: 'Host Command',
    desc: 'The host manages queues, coordinates playback, and keeps the room in sync.',
  },
  {
    icon: MessageSquare,
    color: 'bg-sky-50 text-sky-500',
    title: 'Instant Chat',
    desc: 'Talk while you watch with live chat, indicators, and full message history.',
  },
  {
    icon: Mic,
    color: 'bg-indigo-50 text-indigo-500',
    title: 'Room Voice Calls',
    desc: 'Host launches a live WebRTC voice channel — join, mute, and talk while you watch.',
  },
  {
    icon: ListMusic,
    color: 'bg-emerald-50 text-emerald-500',
    title: 'Auto-Skip Queues',
    desc: 'Build shared playlists that keep the watch party running without interruption.',
  },
  {
    icon: Globe,
    color: 'bg-rose-50 text-rose-500',
    title: 'Public Lounges',
    desc: 'Discover active rooms in the directory and jump into live sessions instantly.',
  },
] as const;

const TRUST_STATS = [
  { value: '0ms', label: 'sync drift target' },
  { value: 'WebRTC', label: 'voice calls' },
  { value: 'Free', label: 'no signup needed' },
] as const;

const HERO_IMAGES = {
  nowPlaying: '/images/hero/cinema-main.jpg',
  avatars: [
    '/images/hero/avatar-1.jpg',
    '/images/hero/avatar-2.jpg',
    '/images/hero/avatar-3.jpg',
    '/images/hero/avatar-4.jpg',
  ],
  lounges: [
    { name: 'Friday Night Vibes', live: 12, thumb: '/images/hero/lounge-party.jpg' },
    { name: 'Lo-Fi Study Room', live: 8, thumb: '/images/hero/lounge-music.jpg' },
    { name: 'Gaming Highlights', live: 5, thumb: '/images/hero/lounge-gaming.jpg' },
  ],
} as const;

function HeroVisual() {
  const bars = [38, 62, 48, 72, 55, 80, 44, 68, 52, 76];

  return (
    <div className="relative w-full max-w-[520px] mx-auto lg:mx-0 lg:ml-auto h-[420px] sm:h-[460px]" aria-hidden="true">
      {/* Main dashboard card */}
      <div className="landing-float-a absolute top-8 left-4 right-8 landing-soft-card bg-white rounded-2xl border border-slate-100 p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <Tv className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-800">Midnight Cinema</p>
              <p className="text-[9px] text-slate-400 font-medium">Room · abc123</p>
            </div>
          </div>
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <div className="aspect-video rounded-xl bg-slate-200 relative overflow-hidden">
          <img
            src={HERO_IMAGES.nowPlaying}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
            <div className="h-full w-[42%] bg-blue-500 rounded-r shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {HERO_IMAGES.avatars.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm object-cover -ml-1 first:ml-0"
              style={{ zIndex: 4 - i }}
            />
          ))}
          <span className="text-[10px] text-slate-400 font-semibold ml-1">4 watching</span>
        </div>
      </div>

      {/* Sync chart card */}
      <div className="landing-float-b absolute top-0 right-0 w-44 landing-soft-card bg-white rounded-xl border border-slate-100 p-3 z-20">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">Sync Health</p>
        <div className="flex items-end gap-[3px] h-16">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                background: i % 2 === 0 ? '#8b5cf6' : '#3b82f6',
                opacity: 0.7 + (i % 3) * 0.1,
              }}
            />
          ))}
        </div>
        <p className="text-[10px] font-bold text-slate-700 mt-2">99.9% aligned</p>
      </div>

      {/* Room list card */}
      <div className="landing-float-c absolute bottom-4 left-0 w-48 landing-soft-card bg-white rounded-xl border border-slate-100 p-3 z-20">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">Active Lounges</p>
        {HERO_IMAGES.lounges.map((lounge) => (
          <div key={lounge.name} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={lounge.thumb}
                alt=""
                className="w-7 h-7 rounded-md object-cover shrink-0 border border-slate-100"
              />
              <span className="text-[10px] font-semibold text-slate-700 truncate">{lounge.name}</span>
            </div>
            <span className="text-[9px] font-bold text-blue-500 shrink-0">{lounge.live} live</span>
          </div>
        ))}
      </div>

      {/* Voice call card */}
      <div className="landing-float-b absolute bottom-24 right-0 w-44 landing-soft-card bg-slate-900 rounded-xl border border-slate-700 p-3 z-30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-100 truncate">Room Audio Link</p>
            <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-px rounded-full">
              LIVE
            </span>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 font-semibold mb-2">3 connected in conversation</p>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
            <div className="h-full w-2/3 bg-emerald-500 rounded-full" />
          </div>
          <Phone className="w-3 h-3 text-indigo-400 shrink-0" />
        </div>
      </div>

      {/* Chat bubble */}
      <div className="landing-float-c absolute bottom-4 right-12 w-36 landing-soft-card bg-white rounded-xl border border-slate-100 p-3 z-20">
        <div className="flex items-start gap-2">
          <img
            src={HERO_IMAGES.avatars[0]}
            alt=""
            className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-100"
          />
          <div>
            <p className="text-[9px] font-bold text-slate-700">Alex</p>
            <p className="text-[9px] text-slate-500 leading-snug mt-0.5">This sync is perfect!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onJoinRoom, onCreateRoom, initialRoomId }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');

  const [createCreatorName, setCreateCreatorName] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  const [createIsPublic, setCreateIsPublic] = useState(false);

  const [joinName, setJoinName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState(initialRoomId || '');

  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);

  useEffect(() => {
    fetchPublicRooms();
  }, []);

  const fetchPublicRooms = async () => {
    setIsLoadingPublic(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(data);
      }
    } catch (err) {
      console.error('Error fetching public rooms:', err);
    } finally {
      setIsLoadingPublic(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = createCreatorName.trim();
    const cleanRoom = createRoomName.trim() || 'Cozy Lounge';
    if (!cleanNick) return;
    onCreateRoom(cleanRoom, createIsPublic, cleanNick);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = joinName.trim();
    const cleanId = joinRoomId.trim().toLowerCase();
    if (!cleanNick || !cleanId) return;
    onJoinRoom(cleanId, cleanNick);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openGetStarted = (tab: 'create' | 'join') => {
    setActiveTab(tab);
    scrollTo('get-started');
  };

  const joinFromDirectory = (roomId: string) => {
    setJoinRoomId(roomId);
    setActiveTab('join');
    scrollTo('get-started');
  };

  return (
    <div className="landing-page min-h-screen text-slate-900 flex flex-col select-none">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/25">
              <Tv className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">TubeSync</span>
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-500">
            <button type="button" onClick={() => scrollTo('hero')} className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer">
              Home
            </button>
            <button type="button" onClick={() => scrollTo('features')} className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1">
              Features
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            <button type="button" onClick={() => scrollTo('how-it-works')} className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer">
              How it works
            </button>
            <button type="button" onClick={() => scrollTo('public-lounges')} className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer">
              Lounges
            </button>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openGetStarted('join')}
              className="hidden sm:inline-flex text-sm font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Join Room
            </button>
            <button
              type="button"
              onClick={() => openGetStarted('create')}
              className="landing-btn-primary text-sm font-bold text-white px-4 py-2 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Create Room
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="hero" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left copy */}
            <div className="max-w-xl">
              <div className="landing-rise inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold mb-6">
                <Zap className="w-3.5 h-3.5" />
                Real-time YouTube synchronization
              </div>

              <h1 className="landing-rise landing-rise-1 text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-5">
                Watch YouTube together,{' '}
                <span className="text-blue-600">perfectly in sync.</span>
              </h1>

              <p className="landing-rise landing-rise-2 text-base sm:text-lg text-slate-500 font-medium leading-relaxed mb-6">
                Create custom viewing lounges with friends. Queue videos together, chat in real-time, hop on live voice calls, and keep every playback locked down to the millisecond.
              </p>

              <div className="landing-rise landing-rise-2 flex flex-wrap gap-2 mb-8">
                {['Synced playback', 'Live chat', 'Voice calls', 'Shared queues'].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm"
                  >
                    {tag === 'Voice calls' && <Mic className="w-3 h-3 text-indigo-500" />}
                    {tag}
                  </span>
                ))}
              </div>

              <div className="landing-rise landing-rise-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openGetStarted('create')}
                  className="landing-btn-primary text-sm font-bold text-white px-6 py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  Create a Room
                </button>
                <button
                  type="button"
                  onClick={() => openGetStarted('join')}
                  className="text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-6 py-3 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-7 h-7 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <Play className="w-3 h-3 text-orange-500 fill-orange-500" />
                  </span>
                  Join a Room
                </button>
              </div>
            </div>

            {/* Right visual */}
            <div className="landing-rise landing-rise-2 hidden sm:block">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 text-center">
          <p className="text-sm font-semibold text-slate-500 mb-6">
            Built for watch parties, study groups, and remote teams who need{' '}
            <span className="text-slate-800">flawless synchronized playback</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-20 py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              What Sets Us Apart
            </h2>
            <p className="text-base text-slate-500 font-medium leading-relaxed">
              Everything you need for a seamless group viewing experience — synced playback, live chat, WebRTC voice calls, and host-controlled queues.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="landing-soft-card bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-300"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="scroll-mt-20 bg-slate-50/70 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              Three steps to a shared screen
            </h2>
            <p className="text-slate-500 font-medium">Get your lounge running in under a minute.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Create a lounge', desc: 'Name your room, pick a nickname, and optionally list it publicly.' },
              { step: '02', title: 'Share the link', desc: 'Send the 6-character room code — friends join in one click.' },
              { step: '03', title: 'Watch in sync', desc: 'Queue videos, chat live, join voice calls, and let the host keep everyone aligned.' },
            ].map((item) => (
              <div key={item.step} className="landing-soft-card bg-white rounded-2xl border border-slate-100 p-7 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Get Started (create / join forms) ── */}
      <section id="get-started" className="scroll-mt-20 py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold mb-5">
                <Video className="w-3.5 h-3.5" />
                Get started free
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Start your watch party now
              </h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-6">
                No accounts, no downloads. Create a lounge or enter a room code and you're watching together in seconds.
              </p>
              <ul className="space-y-3">
                {['Instant room creation', 'Shareable 6-character codes', 'Live voice calls via WebRTC', 'Public directory listing'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
                    <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="landing-soft-card bg-white rounded-2xl border border-slate-100 p-6 md:p-8">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 mb-6">
                <button
                  id="tab-setup-create"
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'create'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Create Room
                </button>
                <button
                  id="tab-setup-join"
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'join'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {initialRoomId ? 'Join Invited Room' : 'Join Room'}
                </button>
              </div>

              {activeTab === 'create' && (
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Your Nickname
                    </label>
                    <input
                      id="input-creator-name"
                      type="text"
                      required
                      placeholder="e.g. Rachel"
                      value={createCreatorName}
                      onChange={(e) => setCreateCreatorName(e.target.value)}
                      maxLength={20}
                      className="landing-input w-full text-sm font-medium bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Lounge Name
                    </label>
                    <input
                      id="input-room-name"
                      type="text"
                      placeholder="e.g. Midnight Cinema Lounge"
                      value={createRoomName}
                      onChange={(e) => setCreateRoomName(e.target.value)}
                      maxLength={32}
                      className="landing-input w-full text-sm font-medium bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 transition-all outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Public Room</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Display room on directory listings</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        id="opt-room-public"
                        type="checkbox"
                        checked={createIsPublic}
                        onChange={(e) => setCreateIsPublic(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
                    </label>
                  </div>
                  <button
                    id="btn-submit-create"
                    type="submit"
                    className="landing-btn-primary w-full text-white font-bold text-sm py-3.5 px-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Initialize Room Session
                  </button>
                </form>
              )}

              {activeTab === 'join' && (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  {initialRoomId && (
                    <div className="bg-orange-50 border border-orange-100 p-3.5 rounded-xl">
                      <p className="text-xs text-orange-700 font-medium leading-relaxed">
                        You've been invited! Set your display name to jump right in.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Your Nickname
                    </label>
                    <input
                      id="input-joining-name"
                      type="text"
                      required
                      placeholder="e.g. Leo"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      maxLength={20}
                      className="landing-input w-full text-sm font-medium bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Room Code ID
                    </label>
                    <input
                      id="input-joining-room-id"
                      type="text"
                      required
                      maxLength={6}
                      disabled={!!initialRoomId}
                      placeholder="6-character room code"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.trim().toLowerCase())}
                      className="landing-input w-full text-sm font-mono font-bold bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 transition-all outline-none uppercase placeholder:font-sans placeholder:font-normal placeholder:normal-case tracking-widest"
                    />
                  </div>
                  <button
                    id="btn-submit-join"
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-slate-900/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Enter Session Stream
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Public Lounges ── */}
      <section id="public-lounges" className="scroll-mt-20 bg-slate-50/70 border-t border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </span>
                Live Public Lounges
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-2 sm:ml-[3.25rem]">
                Join globally active synced parties instantly
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPublicRooms}
              className="text-xs text-blue-600 font-bold border border-blue-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPublic ? 'animate-spin' : ''}`} />
              Refresh Listings
            </button>
          </div>

          {isLoadingPublic ? (
            <div className="text-center py-14">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-semibold">Querying directory...</p>
            </div>
          ) : publicRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {publicRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="landing-soft-card bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-200/60 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{room.name}</h3>
                      <span className="shrink-0 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-lg font-mono uppercase font-bold tracking-wider">
                        {room.roomId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2.5 font-medium line-clamp-1">
                      {room.currentVideoTitle ? (
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                          </span>
                          {room.currentVideoTitle}
                        </span>
                      ) : (
                        'Idle Session'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {room.userCount} in room
                    </span>
                    <button
                      type="button"
                      onClick={() => joinFromDirectory(room.roomId)}
                      className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      Join
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 landing-soft-card bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-600">No active public rooms</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto font-medium leading-relaxed">
                Be the pathfinder! Toggle the 'Public Room' checkmark above and spawn the very first directory lounge.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <Tv className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-800">TubeSync</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Synchronized YouTube watch parties — no account required.</p>
        </div>
      </footer>
    </div>
  );
}
