import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { LeaderboardEntry } from '@xiangqi/shared-types';
import { apiUrl } from '../services/api';
import { Trophy, Award, Swords } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/api/leaderboard'))
      .then((res) => res.json())
      .then((data) => setLeaderboard(data))
      .catch((err) => console.error('Failed to load leaderboard', err))
      .finally(() => setIsLoading(false));
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-8 h-8 rounded-full bg-slate-400/20 border border-slate-400/50 flex items-center justify-center text-slate-300 font-bold">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-8 h-8 rounded-full bg-amber-700/20 border border-amber-700/50 flex items-center justify-center text-amber-600 font-bold">
          🥉
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 font-mono font-bold text-xs">
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
            <Trophy className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-100">Bảng Xếp Hạng Cao Thủ</h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
            Hệ thống tính điểm ELO chuẩn quốc tế dựa trên kết quả các ván đấu chính thức
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-10 text-center">
            <Swords className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <div className="text-sm font-semibold text-neutral-300">Chưa có dữ liệu xếp hạng</div>
            <p className="text-xs text-neutral-500 mt-1">
              Hãy đăng ký tài khoản và bắt đầu thi đấu để trở thành người dẫn đầu bảng!
            </p>
          </div>
        ) : (
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-neutral-950/70 border-b border-neutral-800 text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4 w-16 text-center">Hạng</th>
                    <th className="py-3.5 px-4">Kỳ thủ</th>
                    <th className="py-3.5 px-4 text-center">Điểm ELO</th>
                    <th className="py-3.5 px-4 text-center">Thắng / Thua / Hòa</th>
                    <th className="py-3.5 px-4 text-center">Số trận</th>
                    <th className="py-3.5 px-4 text-center">Tỷ lệ thắng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {leaderboard.map((player) => (
                    <tr
                      key={player.id}
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        <div className="flex items-center justify-center">
                          {getRankBadge(player.rank)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/profile/${player.id}`}
                          className="flex items-center gap-2.5 group-hover:text-amber-400 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-300">
                            {player.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-neutral-200 group-hover:text-amber-400">
                            {player.displayName}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-lg font-mono font-bold text-xs border border-amber-500/20">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          {player.eloRating}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs">
                        <span className="text-emerald-400 font-semibold">{player.wins}</span>
                        <span className="text-neutral-500 mx-1">/</span>
                        <span className="text-red-400 font-semibold">{player.losses}</span>
                        <span className="text-neutral-500 mx-1">/</span>
                        <span className="text-amber-400 font-semibold">{player.draws}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-neutral-300 font-mono">
                        {player.matchesPlayed}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-bold text-cyan-300">
                          {player.winRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
