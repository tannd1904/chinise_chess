import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, LogOut, Swords } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-amber-950/60 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-xl shadow-inner group-hover:scale-105 transition-transform">
            象
          </div>
          <div>
            <div className="font-bold text-lg text-amber-400 tracking-wide flex items-center gap-1.5">
              Xiangqi Online
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                Phase 2
              </span>
            </div>
            <div className="text-xs text-neutral-400">Nền tảng cờ tướng trực tuyến</div>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-amber-400 transition-colors"
          >
            <Swords className="w-4 h-4" />
            Chơi cờ
          </Link>
          <Link
            to="/leaderboard"
            className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-amber-400 transition-colors"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            Bảng xếp hạng
          </Link>
        </nav>

        {/* User / Auth State */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/30 px-3 py-1.5 rounded-lg transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-300">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium text-neutral-200 leading-tight">
                    {user.displayName}
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono font-semibold">
                    ELO {user.eloRating}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Đăng xuất"
                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg transition-colors border border-transparent hover:border-neutral-800"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-medium text-neutral-300 hover:text-amber-300 px-3 py-1.5 rounded-lg hover:bg-neutral-900 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-amber-500 hover:bg-amber-400 text-neutral-950 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm font-semibold"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
