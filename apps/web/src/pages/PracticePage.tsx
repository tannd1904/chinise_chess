import React, { useState, useEffect } from 'react';
import {
  GameSnapshot,
  Move,
  PlayerColor,
  PositionCoordinate,
} from '@xiangqi/shared-types';
import { XiangqiEngine, AIDifficulty } from '@xiangqi/engine';
import { aiService } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { XiangqiBoard } from '../features/board/XiangqiBoard';
import { EvalBar } from '../components/EvalBar';
import {
  Bot,
  RotateCcw,
  Lightbulb,
  Sparkles,
  ArrowUpDown,
  Flag,
  Play,
  RotateCw,
  Trophy,
  Shield,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';

interface DifficultyConfig {
  id: AIDifficulty;
  name: string;
  badge: string;
  elo: string;
  color: string;
  desc: string;
}

const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 1,
    name: 'Tập Chơi',
    badge: 'Dễ',
    elo: '~1000',
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    desc: 'Phù hợp người mới làm quen mặt quân và luật đi cơ bản.',
  },
  {
    id: 2,
    name: 'Kỳ Thủ Trẻ',
    badge: 'Trung Bình',
    elo: '~1300',
    color: 'border-sky-500/40 text-sky-400 bg-sky-500/10',
    desc: 'Tính toán đổi quân hợp lý, không bỏ sót quân chủ lực.',
  },
  {
    id: 3,
    name: 'Cao Thủ',
    badge: 'Khó',
    elo: '~1700',
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    desc: 'Chiến thuật phối hợp sâu sắc, kiểm soát lộ thông và vị trí.',
  },
  {
    id: 4,
    name: 'Kiện Tướng',
    badge: 'Rất Khó',
    elo: '~2000+',
    color: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
    desc: 'Khai cuộc bài bản chuẩn mực, tấn công sát cục biến hóa.',
  },
];

export const PracticePage: React.FC = () => {
  const { user } = useAuth();

  // Setup configuration
  const [playerColor, setPlayerColor] = useState<PlayerColor>('RED');
  const [difficulty, setDifficulty] = useState<AIDifficulty>(2);
  const [timeLimit, setTimeLimit] = useState<number>(0); // 0 = unlimited, or seconds (300, 600, 900)
  const [showSetupModal, setShowSetupModal] = useState<boolean>(true);

  // Active Game State
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() =>
    XiangqiEngine.createInitialGameSnapshot()
  );
  const [boardHistory, setBoardHistory] = useState<GameSnapshot[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<PositionCoordinate | null>(null);
  const [legalTargets, setLegalTargets] = useState<PositionCoordinate[]>([]);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [evalScore, setEvalScore] = useState<number>(0);

  // Timers
  const [playerTime, setPlayerTime] = useState<number>(0);
  const [aiTime, setAiTime] = useState<number>(0);

  // Hint State
  const [hint, setHint] = useState<{ move: Move; explanation: string } | null>(null);
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);

  // Game Result Modal
  const [showResultModal, setShowResultModal] = useState<boolean>(false);

  const aiColor: PlayerColor = playerColor === 'RED' ? 'BLACK' : 'RED';

  // Start / Reset Game
  const handleStartGame = (chosenColor: PlayerColor, chosenDiff: AIDifficulty, chosenTime: number) => {
    setPlayerColor(chosenColor);
    setDifficulty(chosenDiff);
    setTimeLimit(chosenTime);
    setIsFlipped(chosenColor === 'BLACK');

    const initial = XiangqiEngine.createInitialGameSnapshot();
    setSnapshot(initial);
    setBoardHistory([]);
    setSelectedCoord(null);
    setLegalTargets([]);
    setHint(null);
    setEvalScore(0);
    setShowResultModal(false);
    setShowSetupModal(false);

    if (chosenTime > 0) {
      setPlayerTime(chosenTime);
      setAiTime(chosenTime);
    } else {
      setPlayerTime(0);
      setAiTime(0);
    }
  };

  // Clock countdown interval
  useEffect(() => {
    if (timeLimit <= 0 || showSetupModal || showResultModal) return;
    if (snapshot.status !== 'IN_PROGRESS' && snapshot.status !== 'CHECK') return;

    const timer = setInterval(() => {
      if (snapshot.currentTurn === playerColor) {
        setPlayerTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setSnapshot((s) => ({
              ...s,
              status: 'RESIGNED',
              winner: aiColor,
            }));
            setShowResultModal(true);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setAiTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setSnapshot((s) => ({
              ...s,
              status: 'RESIGNED',
              winner: playerColor,
            }));
            setShowResultModal(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimit, showSetupModal, showResultModal, snapshot.currentTurn, snapshot.status, playerColor, aiColor]);

  // AI turn trigger
  useEffect(() => {
    if (showSetupModal || showResultModal) return;
    if (snapshot.currentTurn !== aiColor) return;
    if (snapshot.status !== 'IN_PROGRESS' && snapshot.status !== 'CHECK') return;

    let isMounted = true;
    setIsAiThinking(true);

    const thinkStartTime = Date.now();

    aiService
      .getBestMove(snapshot.pieces, aiColor, difficulty, snapshot.history)
      .then(async ({ bestMove, evalScore: calculatedEval }) => {
        if (!isMounted) return;

        // Ensure a minimum human-like thinking delay (350ms - 600ms)
        const elapsed = Date.now() - thinkStartTime;
        const remainingDelay = Math.max(0, 450 - elapsed);
        if (remainingDelay > 0) {
          await new Promise((r) => setTimeout(r, remainingDelay));
        }
        if (!isMounted) return;

        try {
          const moveResult = XiangqiEngine.applyMove(
            snapshot.pieces,
            aiColor,
            bestMove.move.from,
            bestMove.move.to
          );

          const executedMove: Move = {
            from: bestMove.move.from,
            to: bestMove.move.to,
            capturedPiece: moveResult.capturedPiece,
          };

          const newSnapshot: GameSnapshot = {
            pieces: moveResult.newPieces,
            currentTurn: moveResult.nextTurn,
            moveNumber: snapshot.moveNumber + 1,
            status: moveResult.status,
            winner: moveResult.winner,
            isInCheck: moveResult.inCheck,
            checkedColor: moveResult.checkedColor,
            lastMove: executedMove,
            history: [...snapshot.history, executedMove],
          };

          setBoardHistory((prev) => [...prev, snapshot]);
          setSnapshot(newSnapshot);
          setEvalScore(calculatedEval);

          if (moveResult.status === 'CHECKMATE' || moveResult.status === 'STALEMATE') {
            setShowResultModal(true);
          }
        } catch (err) {
          console.error('Failed to execute AI move:', err);
        } finally {
          setIsAiThinking(false);
        }
      })
      .catch((err) => {
        console.error('AI calculation error:', err);
        setIsAiThinking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [snapshot.currentTurn, snapshot.status, aiColor, difficulty, showSetupModal, showResultModal]);

  // Handle Board Click by Player
  const handleIntersectionClick = (coord: PositionCoordinate) => {
    if (showSetupModal || showResultModal || isAiThinking) return;
    if (snapshot.currentTurn !== playerColor) return;
    if (snapshot.status !== 'IN_PROGRESS' && snapshot.status !== 'CHECK') return;

    // 1. If clicking on one of the legal targets of the currently selected piece
    if (selectedCoord) {
      const isTarget = legalTargets.some((t) => t.x === coord.x && t.y === coord.y);
      if (isTarget) {
        // Execute player's move
        try {
          const moveResult = XiangqiEngine.applyMove(
            snapshot.pieces,
            playerColor,
            selectedCoord,
            coord
          );

          const executedMove: Move = {
            from: selectedCoord,
            to: coord,
            capturedPiece: moveResult.capturedPiece,
          };

          const newSnapshot: GameSnapshot = {
            pieces: moveResult.newPieces,
            currentTurn: moveResult.nextTurn,
            moveNumber: snapshot.moveNumber + 1,
            status: moveResult.status,
            winner: moveResult.winner,
            isInCheck: moveResult.inCheck,
            checkedColor: moveResult.checkedColor,
            lastMove: executedMove,
            history: [...snapshot.history, executedMove],
          };

          setBoardHistory((prev) => [...prev, snapshot]);
          setSnapshot(newSnapshot);
          setSelectedCoord(null);
          setLegalTargets([]);
          setHint(null);

          // Update evaluation score
          aiService.evaluate(newSnapshot.pieces).then(setEvalScore).catch(() => {});

          if (moveResult.status === 'CHECKMATE' || moveResult.status === 'STALEMATE') {
            setShowResultModal(true);
          }
          return;
        } catch (err) {
          console.error('Failed to apply move:', err);
        }
      }
    }

    // 2. Select or change piece selection
    const clickedPiece = snapshot.pieces.find(
      (p) => p.x === coord.x && p.y === coord.y && p.color === playerColor
    );

    if (clickedPiece) {
      setSelectedCoord(coord);
      const moves = XiangqiEngine.getLegalMoves(snapshot.pieces, coord, playerColor);
      setLegalTargets(moves.map((m) => m.to));
    } else {
      setSelectedCoord(null);
      setLegalTargets([]);
    }
  };

  // Undo (Đi lại): Rolls back to previous player turn
  const handleUndo = () => {
    if (isAiThinking || boardHistory.length === 0) return;

    // If currently AI turn (player just moved), undo 1
    // If currently Player turn, undo 2 (AI move + Player move)
    let rollBackCount = snapshot.currentTurn === playerColor ? 2 : 1;
    if (boardHistory.length < rollBackCount) {
      rollBackCount = boardHistory.length;
    }

    const targetSnapshot = boardHistory[boardHistory.length - rollBackCount];
    const newHistory = boardHistory.slice(0, boardHistory.length - rollBackCount);

    setSnapshot(targetSnapshot);
    setBoardHistory(newHistory);
    setSelectedCoord(null);
    setLegalTargets([]);
    setHint(null);
    setShowResultModal(false);

    aiService.evaluate(targetSnapshot.pieces).then(setEvalScore).catch(() => {});
  };

  // Request Hint from AI
  const handleRequestHint = async () => {
    if (isAiThinking || isHintLoading) return;
    if (snapshot.currentTurn !== playerColor) return;

    setIsHintLoading(true);
    try {
      const hintResult = await aiService.getHint(snapshot.pieces, playerColor);
      setHint(hintResult);

      // Auto highlight the suggested move on the board
      setSelectedCoord(hintResult.move.from);
      setLegalTargets([hintResult.move.to]);
    } catch (err) {
      console.error('Failed to get hint:', err);
    } finally {
      setIsHintLoading(false);
    }
  };

  // Resign / Surrender
  const handleResign = () => {
    if (snapshot.status !== 'IN_PROGRESS' && snapshot.status !== 'CHECK') return;
    if (window.confirm('Bạn có chắc chắn muốn xin thua ván này?')) {
      setSnapshot((s) => ({
        ...s,
        status: 'RESIGNED',
        winner: aiColor,
      }));
      setShowResultModal(true);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentDiffConfig = DIFFICULTIES.find((d) => d.id === difficulty) || DIFFICULTIES[1];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:py-6 flex flex-col">
        {/* Top Header / Mode Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-neutral-900/70 border border-neutral-800 rounded-2xl p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold text-neutral-100">
                  Luyện Tập Với Máy (AI)
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${currentDiffConfig.color}`}
                >
                  {currentDiffConfig.name} ({currentDiffConfig.elo})
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {timeLimit > 0 ? `Thời gian: ${timeLimit / 60} phút` : 'Thời gian: Vô hạn'} •{' '}
                {playerColor === 'RED' ? 'Bạn cầm Đỏ (Đi trước)' : 'Bạn cầm Đen (Đi sau)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetupModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg transition-colors shadow-sm"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Ván mới
            </button>
            <button
              onClick={() => setIsFlipped((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors border border-neutral-700"
              title="Đảo góc nhìn bàn cờ"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Đảo bàn cờ
            </button>
          </div>
        </div>

        {/* Main Chess Arena */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/Middle: Chess Board & Eval Bar (col-span-8) */}
          <div className="lg:col-span-8 flex flex-col items-center">
            {/* Top Player (Opponent) Info Bar */}
            <div className="w-full max-w-[600px] flex items-center justify-between px-3 py-2 bg-neutral-900/60 border border-neutral-800 rounded-t-xl">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    aiColor === 'RED' ? 'bg-red-500 shadow-red-500/50' : 'bg-slate-400'
                  } shadow-sm`}
                />
                <span className="font-semibold text-sm text-neutral-200 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-amber-400" />
                  AI ({currentDiffConfig.name})
                </span>
                {isAiThinking && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    Đang tính...
                  </span>
                )}
              </div>

              {timeLimit > 0 && (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                    snapshot.currentTurn === aiColor
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(aiTime)}
                </div>
              )}
            </div>

            {/* Board Container with Side Eval Bar */}
            <div className="relative flex items-center justify-center gap-2 p-2 sm:p-4 bg-neutral-900/40 border-x border-neutral-800 w-full max-w-[600px]">
              {/* Vertical Evaluation Bar */}
              <div className="hidden sm:block absolute -left-10 top-1/2 -translate-y-1/2">
                <EvalBar score={evalScore} isFlipped={isFlipped} />
              </div>

              {/* Xiangqi Board */}
              <div className="relative">
                <XiangqiBoard
                  pieces={snapshot.pieces}
                  currentTurn={snapshot.currentTurn}
                  playerColor={playerColor}
                  isFlipped={isFlipped}
                  selectedCoord={selectedCoord}
                  legalTargets={legalTargets}
                  lastMove={snapshot.lastMove}
                  isInCheck={snapshot.isInCheck}
                  checkedColor={snapshot.checkedColor}
                  onIntersectionClick={handleIntersectionClick}
                  disabled={isAiThinking || showResultModal}
                />

                {/* Subtle Non-Jumping Check Notice */}
                {snapshot.isInCheck && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-red-400 backdrop-blur-sm animate-bounce pointer-events-none">
                    CHIẾU TƯỚNG! ({snapshot.checkedColor === 'RED' ? 'Đỏ' : 'Đen'} bị chiếu)
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Player (User) Info Bar */}
            <div className="w-full max-w-[600px] flex items-center justify-between px-3 py-2 bg-neutral-900/60 border border-neutral-800 rounded-b-xl">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    playerColor === 'RED' ? 'bg-red-500 shadow-red-500/50' : 'bg-slate-400'
                  } shadow-sm`}
                />
                <span className="font-semibold text-sm text-neutral-200">
                  {user ? user.displayName : 'Bạn'}
                </span>
                {snapshot.currentTurn === playerColor && (
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Lượt của bạn
                  </span>
                )}
              </div>

              {timeLimit > 0 && (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                    snapshot.currentTurn === playerColor
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(playerTime)}
                </div>
              )}
            </div>

            {/* Action Bar (Undo, Hint, Resign) */}
            <div className="w-full max-w-[600px] flex items-center justify-between gap-2 mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={boardHistory.length === 0 || isAiThinking}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-700 transition-colors shadow-sm"
                  title="Lùi lại nước cờ (Undo)"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  Đi lại ({boardHistory.length})
                </button>

                <button
                  onClick={handleRequestHint}
                  disabled={snapshot.currentTurn !== playerColor || isAiThinking || isHintLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-700 transition-colors shadow-sm"
                  title="Nhận gợi ý nước đi tối ưu từ AI"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  {isHintLoading ? 'Đang phân tích...' : 'Gợi ý nước đi'}
                </button>
              </div>

              <button
                onClick={handleResign}
                disabled={snapshot.status !== 'IN_PROGRESS' && snapshot.status !== 'CHECK'}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Xin thua ván đấu"
              >
                <Flag className="w-4 h-4 text-red-400" />
                Đầu hàng
              </button>
            </div>

            {/* Tactical Hint Card (if requested) */}
            {hint && (
              <div className="w-full max-w-[600px] mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 text-amber-300">
                <Lightbulb className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-amber-200 mb-0.5">
                    💡 Gợi ý chiến thuật: Đi ({hint.move.from.x}, {hint.move.from.y}) → (
                    {hint.move.to.x}, {hint.move.to.y})
                  </div>
                  <div className="text-amber-300/90 leading-relaxed">{hint.explanation}</div>
                </div>
                <button
                  onClick={() => setHint(null)}
                  className="text-neutral-400 hover:text-neutral-200 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Move Notation, Game Status & Settings (col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Move History Log */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col h-[380px]">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Lịch Sử Nước Đi ({snapshot.history.length})
                </h3>
                <span className="text-xs text-neutral-500">
                  Lượt {Math.ceil(snapshot.moveNumber / 2)}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 font-mono text-xs select-text">
                {snapshot.history.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-neutral-500 italic text-xs">
                    Chưa có nước đi nào
                  </div>
                ) : (
                  snapshot.history.map((m, idx) => {
                    const isRed = idx % 2 === 0;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${
                          idx === snapshot.history.length - 1
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                            : 'hover:bg-neutral-800/60 text-neutral-300'
                        }`}
                      >
                        <span className="text-neutral-500 w-8">{idx + 1}.</span>
                        <span
                          className={`font-semibold ${
                            isRed ? 'text-red-400' : 'text-sky-300'
                          }`}
                        >
                          {isRed ? 'Đỏ' : 'Đen'}
                        </span>
                        <span>
                          ({m.from.x}, {m.from.y}) → ({m.to.x}, {m.to.y})
                        </span>
                        {m.capturedPiece ? (
                          <span className="text-rose-400 font-bold text-[11px]">
                            Ăn {m.capturedPiece.type}
                          </span>
                        ) : (
                          <span className="text-neutral-600">-</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* AI Practice Benefits / Info */}
            <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Shield className="w-4 h-4" />
                Lợi ích khi luyện cờ với AI
              </div>
              <ul className="text-xs text-neutral-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-neutral-200">Không áp lực thời gian:</strong> Thử
                    nghiệm nhiều phương án với tính năng Đi lại (Undo).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-neutral-200">Học nước đi tối ưu:</strong> Sử dụng nút
                    Gợi ý để nhận phân tích thế trận tức thì.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-neutral-200">Rèn luyện khai cuộc:</strong> Cấp Kiện
                    Tướng trang bị bài bản Bình Phong Mã, Trung Pháo, Thuận Pháo.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* MATCH SETUP MODAL */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                if (snapshot.history.length > 0) {
                  setShowSetupModal(false);
                }
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-100">Cấu Hình Ván Luyện Tập</h2>
                <p className="text-xs text-neutral-400">
                  Chọn màu quân, cấp độ thông minh của máy và chế độ thời gian
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* 1. Side Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  1. Chọn Bên Đi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlayerColor('RED')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                      playerColor === 'RED'
                        ? 'border-red-500 bg-red-500/10 text-red-300 shadow-md shadow-red-500/10 ring-1 ring-red-500'
                        : 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500" />
                    Cầm Đỏ (Đi trước)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlayerColor('BLACK')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                      playerColor === 'BLACK'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-300 shadow-md shadow-sky-500/10 ring-1 ring-sky-500'
                        : 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-400" />
                    Cầm Đen (Đi sau)
                  </button>
                </div>
              </div>

              {/* 2. Difficulty Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  2. Chọn Cấp Độ AI
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        difficulty === d.id
                          ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500'
                          : 'border-neutral-800 bg-neutral-800/40 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-neutral-100">{d.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {d.elo}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Time Mode */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  3. Chế Độ Thời Gian
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Vô hạn', val: 0 },
                    { label: '5 phút', val: 300 },
                    { label: '10 phút', val: 600 },
                    { label: '15 phút', val: 900 },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setTimeLimit(t.val)}
                      className={`py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                        timeLimit === t.val
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500'
                          : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={() => handleStartGame(playerColor, difficulty, timeLimit)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-neutral-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-current" />
                Bắt Đầu Ván Đấu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER RESULT MODAL */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-neutral-100 mb-1">
              {snapshot.winner === playerColor
                ? 'Chúc Mừng Bạn Đã Thắng!'
                : snapshot.winner === aiColor
                ? 'AI Đã Giành Chiến Thắng!'
                : 'Ván Đấu Kết Thúc Hòa'}
            </h2>

            <p className="text-sm text-neutral-400 mb-6">
              {snapshot.status === 'CHECKMATE' && 'Chiến thắng bằng Chiếu bí (Checkmate)!'}
              {snapshot.status === 'STALEMATE' && 'Đối thủ hết nước đi hợp lệ (Stalemate)!'}
              {snapshot.status === 'RESIGNED' && 'Ván đấu kết thúc do xin thua hoặc hết giờ.'}
              {snapshot.status === 'DRAW' && 'Hai bên thỏa thuận hòa cờ.'}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowResultModal(false);
                  setShowSetupModal(true);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-sm rounded-xl transition-colors"
              >
                Chơi Ván Mới
              </button>

              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors"
              >
                Xem Lại Bàn Cờ
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
