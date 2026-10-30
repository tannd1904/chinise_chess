import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { SavedMatchSummary, UserProfile } from '@xiangqi/shared-types';
import { apiUrl } from '../services/api';
import { Swords, Calendar, Play, ShieldAlert, Award, Clock } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<SavedMatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || currentUser?.id;

  useEffect(() => {
    if (!targetUserId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileRes, matchesRes] = await Promise.all([
          fetch(apiUrl(`/api/users/${targetUserId}/profile`)),
          fetch(apiUrl(`/api/users/${targetUserId}/matches`)),
        ]);

        if (!profileRes.ok) throw new Error('Không thể tải thông tin kỳ thủ');
        const pData: UserProfile = await profileRes.json();
        setProfile(pData);

        if (matchesRes.ok) {
          const mData: SavedMatchSummary[] = await matchesRes.json();
          setMatches(mData);
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [targetUserId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!targetUserId || (!profile && !isLoading)) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <ShieldAlert className="w-12 h-12 text-amber-500 mb-3" />
          <h2 className="text-xl font-bold mb-2">{error || 'Chưa đăng nhập'}</h2>
          <p className="text-sm text-neutral-400 mb-4">
            Vui lòng đăng nhập hoặc chọn kỳ thủ để xem hồ sơ và lịch sử đấu.
          </p>
          <Link
            to="/login"
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 rounded-xl text-sm"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Profile Header */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 mb-8 backdrop-blur shadow-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/40 flex items-center justify-center text-3xl font-extrabold text-amber-400 shadow-inner">
              {profile?.displayName.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-neutral-100">{profile?.displayName}</h1>
                <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30 self-center sm:self-auto">
                  <Award className="w-3.5 h-3.5" /> ELO {profile?.eloRating}
                </span>
              </div>
              <div className="text-xs text-neutral-400 flex items-center justify-center sm:justify-start gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" /> Gia nhập:{' '}
                  {new Date(profile?.createdAt || '').toLocaleDateString('vi-VN')}
                </span>
                <span className="flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5 text-neutral-500" /> Tổng số trận:{' '}
                  {profile?.matchesPlayed}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-neutral-800/80">
            <div className="bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-emerald-400 font-semibold mb-0.5">Thắng</div>
              <div className="text-xl font-bold text-emerald-300">{profile?.wins}</div>
            </div>
            <div className="bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-red-400 font-semibold mb-0.5">Thua</div>
              <div className="text-xl font-bold text-red-300">{profile?.losses}</div>
            </div>
            <div className="bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-amber-400 font-semibold mb-0.5">Hòa</div>
              <div className="text-xl font-bold text-amber-300">{profile?.draws}</div>
            </div>
            <div className="bg-neutral-950/60 border border-neutral-800/60 rounded-xl p-3 text-center">
              <div className="text-xs text-cyan-400 font-semibold mb-0.5">Tỷ lệ thắng</div>
              <div className="text-xl font-bold text-cyan-300">{profile?.winRate}%</div>
            </div>
          </div>
        </div>

        {/* Match History Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Lịch sử ván đấu ({matches.length})
            </h2>
          </div>

          {matches.length === 0 ? (
            <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-10 text-center">
              <Swords className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <div className="text-sm font-semibold text-neutral-300">Chưa có ván đấu nào</div>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Hãy tạo phòng hoặc tham gia trận đấu để tích lũy điểm và lưu lại các nước đi!
              </p>
              <Link
                to="/"
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs inline-block"
              >
                Vào chơi ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => {
                const isRed = m.redPlayerId === targetUserId;
                const isBlack = m.blackPlayerId === targetUserId;
                const opponentName = isRed
                  ? m.blackPlayerName
                  : isBlack
                  ? m.redPlayerName
                  : `${m.redPlayerName} vs ${m.blackPlayerName}`;

                let outcomeText = 'Hòa';
                let outcomeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                if (m.result === 'RED_WIN') {
                  if (isRed) {
                    outcomeText = 'Chiến thắng';
                    outcomeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  } else if (isBlack) {
                    outcomeText = 'Thất bại';
                    outcomeClass = 'bg-red-500/20 text-red-300 border-red-500/30';
                  } else {
                    outcomeText = 'Đỏ thắng';
                    outcomeClass = 'bg-neutral-800 text-neutral-300 border-neutral-700';
                  }
                } else if (m.result === 'BLACK_WIN') {
                  if (isBlack) {
                    outcomeText = 'Chiến thắng';
                    outcomeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                  } else if (isRed) {
                    outcomeText = 'Thất bại';
                    outcomeClass = 'bg-red-500/20 text-red-300 border-red-500/30';
                  } else {
                    outcomeText = 'Đen thắng';
                    outcomeClass = 'bg-neutral-800 text-neutral-300 border-neutral-700';
                  }
                }

                return (
                  <div
                    key={m.id}
                    className="bg-neutral-900/60 border border-neutral-800/80 hover:border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${outcomeClass}`}
                      >
                        {outcomeText}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-neutral-200">
                          {isRed ? 'Cầm quân Đỏ' : isBlack ? 'Cầm quân Đen' : 'Khán giả'} đối đầu với{' '}
                          <span className="text-amber-400">{opponentName}</span>
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                          <span>Phòng: #{m.roomCode}</span>
                          <span>•</span>
                          <span>{m.totalMoves} nước đi</span>
                          <span>•</span>
                          <span>{m.terminationReason}</span>
                          <span>•</span>
                          <span>{new Date(m.endedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/replay/${m.id}`}
                      className="flex items-center gap-1.5 bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors border border-neutral-700 hover:border-amber-500 self-end sm:self-center"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Xem lại
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
