import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimeControlPreset } from '@xiangqi/shared-types';
import { socketService } from '../services/socket.service';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import {
  Swords,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Zap,
  Clock,
  X,
  CheckCircle2,
  Award,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const socket = socketService.getSocket();
  const { user } = useAuth();

  // Quick Match State
  const [quickTimeControl, setQuickTimeControl] = useState<TimeControlPreset>('rapid');
  const [isSearching, setIsSearching] = useState(false);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [searchRange, setSearchRange] = useState(100);
  const [matchedOpponent, setMatchedOpponent] = useState<{
    name: string;
    elo: number;
    color: string;
  } | null>(null);

  // Custom Create Room State
  const [hostName, setHostName] = useState(user ? user.displayName : 'Kỳ thủ Đỏ');
  const [timeControl, setTimeControl] = useState<TimeControlPreset>('rapid');
  const [allowUndo, setAllowUndo] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Join Room State
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState(user ? user.displayName : 'Kỳ thủ Đen');

  useEffect(() => {
    if (user) {
      setHostName(user.displayName);
      setJoinName(user.displayName);
    }
  }, [user]);

  // Socket listeners for matchmaking
  useEffect(() => {
    const handleQueued = (data: { timeControl: TimeControlPreset; currentElo: number; searchRange: number }) => {
      setIsSearching(true);
      setSearchElapsed(0);
      setSearchRange(data.searchRange);
    };

    const handleStatus = (data: { elapsedSec: number; searchRange: number }) => {
      setSearchElapsed(data.elapsedSec);
      setSearchRange(data.searchRange);
    };

    const handleCancelled = () => {
      setIsSearching(false);
      setSearchElapsed(0);
      setMatchedOpponent(null);
    };

    const handleMatched = (data: {
      roomId: string;
      roomCode: string;
      playerToken: string;
      color: string;
      opponentName: string;
      opponentElo: number;
    }) => {
      socketService.saveToken(data.roomId, data.playerToken);
      socketService.saveToken(data.roomCode, data.playerToken);

      setMatchedOpponent({
        name: data.opponentName,
        elo: data.opponentElo,
        color: data.color,
      });

      // Brief 1.2s delay to show opponent before navigating
      setTimeout(() => {
        setIsSearching(false);
        navigate(`/room/${data.roomId}`);
      }, 1200);
    };

    socket.on('matchmaking:queued', handleQueued);
    socket.on('matchmaking:status', handleStatus);
    socket.on('matchmaking:cancelled', handleCancelled);
    socket.on('matchmaking:matched', handleMatched);

    return () => {
      socket.off('matchmaking:queued', handleQueued);
      socket.off('matchmaking:status', handleStatus);
      socket.off('matchmaking:cancelled', handleCancelled);
      socket.off('matchmaking:matched', handleMatched);
    };
  }, [socket, navigate]);

  const handleStartQuickMatch = () => {
    if (!socket.connected) {
      socket.connect();
    }

    const playerName = user ? user.displayName : hostName.trim() || 'Kỳ thủ';
    socket.emit('matchmaking:queue', {
      playerName,
      timeControl: quickTimeControl,
      userId: user?.id,
    });
    setIsSearching(true);
    setSearchElapsed(0);
    setMatchedOpponent(null);
  };

  const handleCancelQuickMatch = () => {
    socket.emit('matchmaking:cancel');
    setIsSearching(false);
    setSearchElapsed(0);
    setMatchedOpponent(null);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('room:create', {
      playerName: hostName.trim() || 'Kỳ thủ Đỏ',
      timeControl,
      allowUndo,
      userId: user?.id,
    });

    socket.once('room:created', (data) => {
      socketService.saveToken(data.roomId, data.playerToken);
      setIsCreating(false);
      navigate(`/room/${data.roomId}`);
    });

    socket.once('error', (err) => {
      setIsCreating(false);
      alert('Không thể tạo phòng: ' + err.message);
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    let targetCode = joinCode.trim();
    if (targetCode.includes('/room/')) {
      const parts = targetCode.split('/room/');
      targetCode = parts[parts.length - 1];
    }

    if (joinName.trim()) {
      sessionStorage.setItem('preferredPlayerName', joinName.trim());
    }

    navigate(`/room/${targetCode}`);
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full max-w-6xl mx-auto px-4 py-8 md:py-10 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 border border-stone-800 text-amber-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hệ thống ghép trận tự động chuẩn ELO thời gian thực</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-stone-100">
            Kỳ Đài Cờ Tướng Trực Tuyến
          </h2>
          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            Hệ thống Quick Match tự động ghép đối thủ ngang trình độ ELO, chống gian lận và tối ưu độ trễ với kiến trúc Server-Authoritative.
          </p>
        </div>

        {/* Featured Card: Quick Match */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/30 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="text-center md:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 mb-2">
                  <Zap className="w-3.5 h-3.5 fill-current" /> Ghép Trận Nhanh (Quick Match)
                </div>
                <h3 className="text-2xl font-black text-stone-100 mb-1">
                  Tìm đối thủ ngẫu nhiên theo ELO
                </h3>
                <p className="text-xs text-stone-400 max-w-md">
                  Tự động ghép bạn với kỳ thủ có trình độ tương đương. Không cần chia sẻ mã phòng hay chờ đợi lâu.
                </p>

                {user && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-300 bg-amber-950/50 border border-amber-500/30 px-3 py-1 rounded-full font-mono font-medium">
                    <Award className="w-3.5 h-3.5" /> Điểm ELO của bạn: <strong>{user.eloRating}</strong>
                  </div>
                )}
              </div>

              {/* Time Control & CTA */}
              <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'blitz', label: '3 Phút', sub: 'Chớp' },
                    { id: 'rapid', label: '10 Phút', sub: 'Nhanh' },
                    { id: 'standard', label: '30 Phút', sub: 'Tiêu chuẩn' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuickTimeControl(item.id as TimeControlPreset)}
                      className={`py-2 px-2 text-center rounded-xl border text-xs transition-all ${
                        quickTimeControl === item.id
                          ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-md'
                          : 'bg-stone-950/80 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-[10px] opacity-80">{item.sub}</div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleStartQuickMatch}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  <span>Tìm Trận Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Card 1: Custom Room */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl hover:border-stone-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-100">Tạo Phòng Tự Do</h3>
                  <p className="text-xs text-stone-400">Gửi link mời bạn bè vào đấu</p>
                </div>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Tên kỳ thủ
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    maxLength={20}
                    required
                    placeholder="Nhập tên người chơi..."
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Thời gian mỗi bên
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'blitz', label: '3 Phút' },
                      { id: 'rapid', label: '10 Phút' },
                      { id: 'standard', label: '30 Phút' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTimeControl(item.id as TimeControlPreset)}
                        className={`py-1.5 px-1 text-center rounded-xl border text-xs transition-all ${
                          timeControl === item.id
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-stone-400" />
                    <div>
                      <div className="text-xs font-semibold text-stone-200">Cho phép đi lại (Undo)</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowUndo}
                    onChange={(e) => setAllowUndo(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-stone-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>{isCreating ? 'Đang tạo phòng...' : 'Tạo phòng chơi riêng'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Join Existing Room */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl hover:border-stone-700 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-100">Vào Phòng Đã Có</h3>
                  <p className="text-xs text-stone-400">Nhập mã phòng 6 ký tự hoặc link mời</p>
                </div>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Tên kỳ thủ
                  </label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={20}
                    required
                    placeholder="Nhập tên người chơi..."
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Mã phòng
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                    placeholder="Ví dụ: XQ8A2B hoặc dán link mời..."
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 font-mono text-xs uppercase placeholder:normal-case focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-2 text-stone-400 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] leading-tight">Tự động kết nối lại khi tải lại trang</span>
                </div>

                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-100 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 transition-all cursor-pointer"
                >
                  <span>Tham gia phòng</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Matchmaking Queue Modal Overlay */}
      {isSearching && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden">
            {/* Ambient pulse */}
            <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 relative">
              <span className="animate-ping absolute inset-0 rounded-full bg-amber-500/10" />
              <span className="font-calligraphy text-4xl text-amber-400 font-bold">象</span>
            </div>

            {matchedOpponent ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4" /> Đã tìm thấy đối thủ!
                </div>
                <h3 className="text-xl font-black text-stone-100">{matchedOpponent.name}</h3>
                <p className="text-xs text-amber-400 font-mono">
                  ELO {matchedOpponent.elo} • Bạn cầm quân {matchedOpponent.color === 'RED' ? 'Đỏ' : 'Đen'}
                </p>
                <div className="text-xs text-stone-500 mt-2">Đang chuyển vào phòng đấu...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-100 mb-0.5">Đang tìm đối thủ...</h3>
                  <p className="text-xs text-stone-400 capitalize">
                    Chế độ: {quickTimeControl} ({quickTimeControl === 'blitz' ? '3 phút' : quickTimeControl === 'rapid' ? '10 phút' : '30 phút'})
                  </p>
                </div>

                {/* Timer & Range */}
                <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3 space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Thời gian chờ:
                    </span>
                    <strong className="text-amber-400 text-sm">{formatElapsed(searchElapsed)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 text-[11px]">
                    <span>Phạm vi ELO:</span>
                    <span>±{searchRange} điểm</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCancelQuickMatch}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-red-950/40 hover:text-red-300 hover:border-red-500/40 text-stone-300 font-semibold text-xs border border-stone-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Hủy tìm trận
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};
