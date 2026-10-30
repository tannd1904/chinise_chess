import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { XiangqiBoard } from '../features/board/XiangqiBoard';
import { XiangqiEngine, createInitialPieces } from '@xiangqi/engine';
import { SavedMatchDetail, Piece, Move, PlayerColor } from '@xiangqi/shared-types';
import { apiUrl } from '../services/api';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface ReplayStep {
  stepIndex: number; // 0 to N
  pieces: Piece[];
  lastMove: Move | null;
  currentTurn: PlayerColor;
  moveNotation: string;
}

export const MatchReplayPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

  const [match, setMatch] = useState<SavedMatchDetail | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1500); // ms per move
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moveListRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch Match Data
  useEffect(() => {
    if (!matchId) return;

    fetch(apiUrl(`/api/matches/${matchId}`))
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải dữ liệu ván đấu');
        return res.json();
      })
      .then((data: SavedMatchDetail) => {
        setMatch(data);
        setCurrentStepIndex(data.moves.length); // Default to final board position
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [matchId]);

  // 2. Precompute all board states across the match
  const replaySteps: ReplayStep[] = useMemo(() => {
    const initialPieces = createInitialPieces();
    const steps: ReplayStep[] = [
      {
        stepIndex: 0,
        pieces: initialPieces,
        lastMove: null,
        currentTurn: 'RED',
        moveNotation: 'Bắt đầu ván đấu',
      },
    ];

    if (!match || match.moves.length === 0) return steps;

    let currentPieces = initialPieces;
    for (let i = 0; i < match.moves.length; i++) {
      const m = match.moves[i];
      const from = { x: m.fromX, y: m.fromY };
      const to = { x: m.toX, y: m.toY };
      const turn: PlayerColor = m.playerColor;

      try {
        const result = XiangqiEngine.applyMove(currentPieces, turn, from, to);
        currentPieces = result.newPieces;

        const notation = `${turn === 'RED' ? 'Đỏ' : 'Đen'} (${from.x},${from.y}) → (${to.x},${to.y})${
          m.capturedPiece ? ` ăn ${m.capturedPiece}` : ''
        }`;

        steps.push({
          stepIndex: i + 1,
          pieces: currentPieces,
          lastMove: {
            from,
            to,
            capturedPiece: m.capturedPiece ? ({ type: m.capturedPiece as any } as Piece) : undefined,
          },
          currentTurn: result.nextTurn,
          moveNotation: notation,
        });
      } catch (err) {
        console.warn(`Error applying replay move ${i + 1}:`, err);
        break;
      }
    }

    return steps;
  }, [match]);

  const totalSteps = replaySteps.length - 1;
  const currentStep = replaySteps[currentStepIndex] || replaySteps[0];

  // 3. Auto-play loop
  useEffect(() => {
    if (!isPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= totalSteps) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playSpeed);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPlaying, totalSteps, playSpeed]);

  // Auto-scroll move list to active move
  useEffect(() => {
    if (moveListRef.current) {
      const activeEl = moveListRef.current.querySelector('.active-replay-move');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentStepIndex]);

  const handleStepJump = (index: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(Math.max(0, Math.min(totalSteps, index)));
  };

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

  if (error || !match) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
          <h2 className="text-xl font-bold mb-2">Không tìm thấy ván đấu</h2>
          <p className="text-xs text-neutral-400 mb-4">{error || 'Ván đấu không tồn tại hoặc đã bị xóa.'}</p>
          <Link
            to="/"
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full flex flex-col">
        {/* Match Header Bar */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="p-2 text-neutral-400 hover:text-neutral-100 bg-neutral-800/80 hover:bg-neutral-800 rounded-xl transition-colors"
              title="Quay lại hồ sơ"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <span>{match.redPlayerName}</span>
                <span className="text-xs text-red-400 font-semibold">(Đỏ)</span>
                <span className="text-neutral-500">vs</span>
                <span>{match.blackPlayerName}</span>
                <span className="text-xs text-neutral-400 font-semibold">(Đen)</span>
              </div>
              <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>Phòng #{match.roomCode}</span>
                <span>•</span>
                <span className="text-amber-400 font-medium">{match.terminationReason}</span>
                <span>•</span>
                <span>{new Date(match.endedAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
                match.result === 'RED_WIN'
                  ? 'bg-red-500/10 text-red-300 border-red-500/30'
                  : match.result === 'BLACK_WIN'
                  ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              {match.result === 'RED_WIN'
                ? 'Đỏ Thắng'
                : match.result === 'BLACK_WIN'
                ? 'Đen Thắng'
                : 'Hòa Trận'}
            </span>
          </div>
        </div>

        {/* Main Content: Board + Replay Controls & Move Notation */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Replay Board View (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Top Indicator */}
            <div className="w-full max-w-[560px] h-8 flex items-center justify-between px-3 mb-2 bg-neutral-900/60 rounded-xl border border-neutral-800/80 text-xs text-neutral-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    currentStep.currentTurn === 'RED' ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-neutral-400'
                  }`}
                />
                Lượt:{' '}
                <strong className={currentStep.currentTurn === 'RED' ? 'text-red-400' : 'text-neutral-300'}>
                  {currentStep.currentTurn === 'RED' ? 'Quân Đỏ' : 'Quân Đen'}
                </strong>
              </span>
              <span className="font-mono text-neutral-400">
                Nước đi: <strong className="text-amber-400">{currentStepIndex}</strong> / {totalSteps}
              </span>
            </div>

            {/* Xiangqi Board */}
            <div className="w-full max-w-[560px] flex justify-center">
              <XiangqiBoard
                pieces={currentStep.pieces}
                currentTurn={currentStep.currentTurn}
                isFlipped={isFlipped}
                selectedCoord={null}
                legalTargets={[]}
                lastMove={currentStep.lastMove}
                disabled={true}
                onIntersectionClick={() => {}}
              />
            </div>

            {/* Playback Control Bar */}
            <div className="w-full max-w-[560px] mt-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStepJump(0)}
                  disabled={currentStepIndex === 0}
                  title="Về nước đầu tiên (|<<)"
                  className="p-2 text-neutral-300 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleStepJump(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                  title="Nước trước đó (<)"
                  className="p-2 text-neutral-300 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Tạm dừng' : 'Tự động phát'}
                  className="p-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl transition-transform active:scale-95 shadow-md mx-1"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <button
                  onClick={() => handleStepJump(currentStepIndex + 1)}
                  disabled={currentStepIndex >= totalSteps}
                  title="Nước kế tiếp (>)"
                  className="p-2 text-neutral-300 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleStepJump(totalSteps)}
                  disabled={currentStepIndex >= totalSteps}
                  title="Đến nước cuối cùng (>>|)"
                  className="p-2 text-neutral-300 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Speed & Flip */}
              <div className="flex items-center gap-2">
                <select
                  value={playSpeed}
                  onChange={(e) => setPlaySpeed(Number(e.target.value))}
                  className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value={2000}>Tốc độ: Chậm (2s)</option>
                  <option value={1500}>Tốc độ: Chuẩn (1.5s)</option>
                  <option value={800}>Tốc độ: Nhanh (0.8s)</option>
                </select>

                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  title="Đảo góc nhìn bàn cờ"
                  className="p-2 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-800"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Sequential Move Notation List (5 Cols) */}
          <div className="lg:col-span-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col h-[650px] shadow-xl backdrop-blur">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-2">
              <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Ký âm nước đi ({match.moves.length})
              </h3>
              <span className="text-xs text-neutral-500">Nhấp vào nước đi để chuyển bước</span>
            </div>

            <div
              ref={moveListRef}
              className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs"
            >
              {/* Step 0: Starting State */}
              <div
                onClick={() => handleStepJump(0)}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                  currentStepIndex === 0
                    ? 'active-replay-move bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'bg-neutral-950/40 hover:bg-neutral-800/60 text-neutral-400'
                }`}
              >
                <span>0. Vị trí khởi đầu</span>
                <span className="text-[10px] text-neutral-500 font-sans">Setup</span>
              </div>

              {/* Move list pairs */}
              {Array.from({ length: Math.ceil(match.moves.length / 2) }).map((_, roundIdx) => {
                const redMoveIndex = roundIdx * 2 + 1;
                const blackMoveIndex = roundIdx * 2 + 2;

                const redMove = match.moves[redMoveIndex - 1];
                const blackMove = match.moves[blackMoveIndex - 1];

                return (
                  <div key={roundIdx} className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-2 text-neutral-500 font-semibold text-center">
                      {roundIdx + 1}.
                    </div>

                    {/* Red Move Box */}
                    <div
                      onClick={() => handleStepJump(redMoveIndex)}
                      className={`col-span-5 p-2 rounded-lg cursor-pointer transition-colors text-center ${
                        currentStepIndex === redMoveIndex
                          ? 'active-replay-move bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-neutral-950/50 hover:bg-neutral-800/60 text-red-400/90'
                      }`}
                    >
                      ({redMove.fromX},{redMove.fromY}) → ({redMove.toX},{redMove.toY})
                      {redMove.capturedPiece && (
                        <span className="text-[10px] text-amber-500 block">x{redMove.capturedPiece}</span>
                      )}
                    </div>

                    {/* Black Move Box */}
                    {blackMove ? (
                      <div
                        onClick={() => handleStepJump(blackMoveIndex)}
                        className={`col-span-5 p-2 rounded-lg cursor-pointer transition-colors text-center ${
                          currentStepIndex === blackMoveIndex
                            ? 'active-replay-move bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'bg-neutral-950/50 hover:bg-neutral-800/60 text-neutral-300'
                        }`}
                      >
                        ({blackMove.fromX},{blackMove.fromY}) → ({blackMove.toX},{blackMove.toY})
                        {blackMove.capturedPiece && (
                          <span className="text-[10px] text-amber-500 block">x{blackMove.capturedPiece}</span>
                        )}
                      </div>
                    ) : (
                      <div className="col-span-5 text-center text-neutral-700">-</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
