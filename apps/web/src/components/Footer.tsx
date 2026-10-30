import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-stone-800/80 py-6 text-center text-xs text-stone-500 bg-neutral-950/60 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-stone-400">
          Cờ Tướng Online — Trang web được tạo ra bởi{' '}
          <strong className="text-amber-400 font-semibold">TanND</strong>
        </p>
        <p className="text-[11px] text-stone-600 mt-1">
          Hệ thống cờ tướng thời gian thực, lưu trữ lịch sử & xếp hạng ELO chuẩn quốc tế.
        </p>
      </div>
    </footer>
  );
};

