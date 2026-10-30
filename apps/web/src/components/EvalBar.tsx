import React from 'react';

interface EvalBarProps {
  score: number; // Positive = Red leads, Negative = Black leads
  isFlipped?: boolean; // If Black is player (bottom)
  className?: string;
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, isFlipped = false, className = '' }) => {
  // Sigmoid-based calculation: maps chess score (-1500..+1500) to 5%..95%
  // 0 score = 50%
  const normalizedAdvantage = Math.max(-2500, Math.min(2500, score));
  const redPercentage = Math.round(
    5 + (90 / (1 + Math.exp(-0.0025 * normalizedAdvantage)))
  );

  // If board is flipped, Black is on bottom
  const bottomPercentage = isFlipped ? 100 - redPercentage : redPercentage;
  const formattedScore = (Math.abs(score) / 100).toFixed(1);
  const leadingSide = score > 30 ? 'Đỏ' : score < -30 ? 'Đen' : 'Cân';
  const label = score > 30 ? `+${formattedScore}` : score < -30 ? `-${formattedScore}` : '0.0';

  return (
    <div
      className={`flex flex-col items-center select-none ${className}`}
      title={`Đánh giá thế trận: ${leadingSide} (${label})`}
    >
      <div className="text-[10px] font-bold text-neutral-400 mb-1">
        {label}
      </div>
      <div className="relative w-4 h-64 md:h-80 bg-neutral-900 border border-neutral-700 rounded-full overflow-hidden flex flex-col justify-end shadow-inner">
        {/* Black side (top if not flipped) */}
        <div
          className="w-full bg-slate-700 transition-all duration-500 ease-out"
          style={{ height: `${100 - bottomPercentage}%` }}
        />
        {/* Red side (bottom if not flipped) */}
        <div
          className="w-full bg-red-600 transition-all duration-500 ease-out"
          style={{ height: `${bottomPercentage}%` }}
        />
      </div>
      <div className="text-[9px] text-neutral-500 mt-1 uppercase font-semibold">
        {isFlipped ? (score < 0 ? 'Đen' : 'Đỏ') : (score > 0 ? 'Đỏ' : 'Đen')}
      </div>
    </div>
  );
};
