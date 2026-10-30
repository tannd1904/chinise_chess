import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3">
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-100">Đăng nhập tài khoản</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Lưu trữ lịch sử ván đấu, tính điểm ELO và leo bảng xếp hạng
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold py-2.5 px-4 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-neutral-400 border-t border-neutral-800 pt-4">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-amber-400 hover:underline font-semibold">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
