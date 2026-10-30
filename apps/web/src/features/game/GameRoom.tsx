import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChatMessage,
  ClockState,
  GameSnapshot,
  Move,
  PlayerColor,
  PositionCoordinate,
  RoomDetails,
} from '@xiangqi/shared-types';
import { XiangqiEngine } from '@xiangqi/engine';
import { socketService } from '../../services/socket.service';
import { useAuth } from '../../contexts/AuthContext';
import { XiangqiBoard } from '../board/XiangqiBoard';
import {
  Copy,
  Check,
  RotateCw,
  Flag,
  Users,
  Undo2,
  Clock,
  ShieldAlert,
  ArrowLeft,
  AlertCircle,
  MessageSquare,
  Send,
  History,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canonicalRoomId = useRef<string>(roomId || '');

  // Room & Player State
  const [roomState, setRoomState] = useState<RoomDetails | null>(null);
  const [gameState, setGameState] = useState<GameSnapshot | null>(null);
  const [clock, setClock] = useState<ClockState | null>(null);
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  const [playerToken, setPlayerToken] = useState<string>('');

  // UI Interactive States
  const [selectedCoord, setSelectedCoord] = useState<PositionCoordinate | null>(null);
  const [legalTargets, setLegalTargets] = useState<PositionCoordinate[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [drawOfferIncoming, setDrawOfferIncoming] = useState(false);
  const [undoOfferIncoming, setUndoOfferIncoming] = useState(false);
  const [confirmResignOpen, setConfirmResignOpen] = useState(false);

  // Interpolated clocks (in milliseconds)
  const [displayRedTime, setDisplayRedTime] = useState<number>(0);
  const [displayBlackTime, setDisplayBlackTime] = useState<number>(0);

  const socket = socketService.getSocket();

  // Tab & Chat States
  const [sidebarTab, setSidebarTab] = useState<'history' | 'chat'>('history');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Focus / Large Board Mode
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Keyboard shortcut: 'F' to toggle focus mode, 'Escape' to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
      if (e.key === 'f' || e.key === 'F') {
        setIsFocusMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const sidebarTabRef = useRef<'history' | 'chat'>('history');
  sidebarTabRef.current = sidebarTab;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (sidebarTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, sidebarTab]);

  // Auto-dismiss floating error messages after 3.5s
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Initialize and connect socket
  useEffect(() => {
    if (!roomId) return;

    canonicalRoomId.current = roomId;
    const storedToken = socketService.getToken(roomId) || '';
    setPlayerToken(storedToken);

    if (!socket.connected) {
      socket.connect();
    }

    // Try joining / reconnecting
    const preferredName = sessionStorage.getItem('preferredPlayerName') || user?.displayName || 'Player';
    socket.emit('room:join', {
      roomIdOrCode: roomId,
      playerName: preferredName,
      playerToken: storedToken || undefined,
      userId: user?.id,
    });

    const handleRoomJoined = (data: any) => {
      canonicalRoomId.current = data.roomId;
      setRoomState(data.roomState);
      setMyColor(data.color);
      setPlayerToken(data.playerToken);

      // Save token under both UUID and short code
      socketService.saveToken(data.roomId, data.playerToken);
      if (data.roomCode) {
        socketService.saveToken(data.roomCode, data.playerToken);
      }

      // Update URL to canonical UUID without page reload
      if (window.location.pathname !== `/room/${data.roomId}`) {
        window.history.replaceState(null, '', `/room/${data.roomId}`);
      }

      if (data.gameState) setGameState(data.gameState);
      if (data.clock) setClock(data.clock);

      // Default perspective: if player is Black, flip board
      if (data.color === 'BLACK') {
        setIsFlipped(true);
      }
    };

    const handleRoomUpdated = (data: { roomState: RoomDetails }) => {
      setRoomState(data.roomState);
    };

    const handleGameStarted = (data: { roomState: RoomDetails; gameState: GameSnapshot; clock: ClockState }) => {
      setRoomState(data.roomState);
      setGameState(data.gameState);
      setClock(data.clock);
    };

    const handleMoveAccepted = (data: { move: Move; nextTurn: PlayerColor; moveNumber: number; gameState: GameSnapshot; clock: ClockState }) => {
      setGameState(data.gameState);
      setClock(data.clock);
      setSelectedCoord(null);
      setLegalTargets([]);
      setErrorMessage(null);
    };

    const handleMoveRejected = (data: { reason: string }) => {
      setErrorMessage(data.reason);
      setSelectedCoord(null);
      setLegalTargets([]);
    };

    const handleCheck = () => {};

    const handleGameFinished = (data: { winner: PlayerColor | null; reason: string; gameState: GameSnapshot }) => {
      setGameState(data.gameState);
      setRoomState((prev) => (prev ? { ...prev, status: 'FINISHED', winner: data.winner, finishReason: data.reason } : null));
    };

    const handleDrawOffered = () => setDrawOfferIncoming(true);
    const handleDrawDeclined = () => alert('Đối thủ đã từ chối lời đề nghị hòa!');
    const handleUndoOffered = () => setUndoOfferIncoming(true);

    const handleUndoResolved = (data: { accepted: boolean; gameState?: GameSnapshot; clock?: ClockState; reason?: string }) => {
      if (data.accepted && data.gameState) {
        setGameState(data.gameState);
        if (data.clock) setClock(data.clock);
      } else {
        alert(data.reason || 'Yêu cầu đi lại không được chấp thuận.');
      }
    };

    const handleClockSync = (data: { redTimeMs: number; blackTimeMs: number; currentTurn: PlayerColor }) => {
      setClock((prev) => prev ? { ...prev, ...data } : null);
    };

    const handleError = (data: { message: string }) => {
      setErrorMessage(data.message);
    };

    const handleChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      if (sidebarTabRef.current !== 'chat') {
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    socket.on('room:joined', handleRoomJoined);
    socket.on('room:updated', handleRoomUpdated);
    socket.on('game:started', handleGameStarted);
    socket.on('game:move-accepted', handleMoveAccepted);
    socket.on('game:move-rejected', handleMoveRejected);
    socket.on('game:check', handleCheck);
    socket.on('game:finished', handleGameFinished);
    socket.on('game:draw-offered', handleDrawOffered);
    socket.on('game:draw-declined', handleDrawDeclined);
    socket.on('game:undo-offered', handleUndoOffered);
    socket.on('game:undo-resolved', handleUndoResolved);
    socket.on('game:clock', handleClockSync);
    socket.on('chat:message', handleChatMessage);
    socket.on('error', handleError);

    return () => {
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:updated', handleRoomUpdated);
      socket.off('game:started', handleGameStarted);
      socket.off('game:move-accepted', handleMoveAccepted);
      socket.off('game:move-rejected', handleMoveRejected);
      socket.off('game:check', handleCheck);
      socket.off('game:finished', handleGameFinished);
      socket.off('game:draw-offered', handleDrawOffered);
      socket.off('game:draw-declined', handleDrawDeclined);
      socket.off('game:undo-offered', handleUndoOffered);
      socket.off('game:undo-resolved', handleUndoResolved);
      socket.off('game:clock', handleClockSync);
      socket.off('chat:message', handleChatMessage);
      socket.off('error', handleError);
    };
  }, [roomId]);

  // Client-side clock interpolation
  useEffect(() => {
    if (!clock || clock.isPaused) {
      if (clock) {
        setDisplayRedTime(clock.redTimeMs);
        setDisplayBlackTime(clock.blackTimeMs);
      }
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - clock.turnStartedAt;
      if (clock.currentTurn === 'RED') {
        setDisplayRedTime(Math.max(0, clock.redTimeMs - elapsed));
        setDisplayBlackTime(clock.blackTimeMs);
      } else {
        setDisplayBlackTime(Math.max(0, clock.blackTimeMs - elapsed));
        setDisplayRedTime(clock.redTimeMs);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [clock]);

  // Handle Board Intersection Click
  const handleIntersectionClick = (coord: PositionCoordinate) => {
    if (!gameState || !myColor || !roomId) return;

    if (roomState?.status !== 'ACTIVE') {
      if (roomState?.status === 'WAITING') {
        setErrorMessage('Đang chờ đối thủ vào phòng. Hãy chia sẻ link mời để bắt đầu!');
      } else if (roomState?.status === 'READY') {
        socket.emit('game:ready', { roomId, playerToken });
        setErrorMessage('Đang bắt đầu ván đấu...');
      }
      return;
    }

    // Is it my turn?
    const isMyTurn = gameState.currentTurn === myColor;
    if (!isMyTurn) {
      setErrorMessage(`Chưa đến lượt của bạn! Hiện đang là lượt đi của ${gameState.currentTurn === 'RED' ? 'Quân Đỏ' : 'Quân Đen'}.`);
      return;
    }

    // 1. If clicking a legal target, submit move!
    const isTarget = legalTargets.some((t) => t.x === coord.x && t.y === coord.y);
    if (selectedCoord && isTarget) {
      const activeRoomId = canonicalRoomId.current || roomId;
      socket.emit('game:move', {
        roomId: activeRoomId,
        playerToken,
        from: selectedCoord,
        to: coord,
        moveNumber: gameState.moveNumber,
      });
      setSelectedCoord(null);
      setLegalTargets([]);
      setErrorMessage(null);
      return;
    }

    // 2. If clicking on one of my pieces, select it and preview legal targets
    const clickedPiece = gameState.pieces.find((p) => p.x === coord.x && p.y === coord.y);
    if (clickedPiece && clickedPiece.color === myColor) {
      setSelectedCoord(coord);
      const moves = XiangqiEngine.getLegalMoves(gameState.pieces, coord, myColor);
      setLegalTargets(moves.map((m) => m.to));
      if (moves.length === 0) {
        setErrorMessage('Quân này hiện đang bị cản hoặc không có nước đi hợp lệ!');
      } else {
        setErrorMessage(null);
      }
      return;
    }

    // If clicking opponent piece without having selected a piece
    if (clickedPiece && clickedPiece.color !== myColor && !selectedCoord) {
      setErrorMessage(`Bạn đang cầm quân ${myColor === 'RED' ? 'Đỏ' : 'Đen'}, không thể chọn quân ${clickedPiece.color === 'RED' ? 'Đỏ' : 'Đen'} của đối thủ!`);
      return;
    }

    // 3. Clicking on an empty space or invalid tile: deselect
    setSelectedCoord(null);
    setLegalTargets([]);
  };

  // Format time mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy helpers
  const copyRoomCode = () => {
    if (!roomState?.code) return;
    navigator.clipboard.writeText(roomState.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Actions
  const handleResign = () => {
    const activeRoomId = canonicalRoomId.current || roomId;
    if (!activeRoomId) return;
    socket.emit('game:resign', { roomId: activeRoomId, playerToken });
    setConfirmResignOpen(false);
  };

  const handleOfferDraw = () => {
    const activeRoomId = canonicalRoomId.current || roomId;
    if (!activeRoomId) return;
    socket.emit('game:draw-offer', { roomId: activeRoomId, playerToken });
    alert('Đã gửi đề nghị hòa tới đối thủ!');
  };

  const handleRespondDraw = (accept: boolean) => {
    const activeRoomId = canonicalRoomId.current || roomId;
    if (!activeRoomId) return;
    socket.emit('game:draw-response', { roomId: activeRoomId, playerToken, accept });
    setDrawOfferIncoming(false);
  };

  const handleRequestUndo = () => {
    const activeRoomId = canonicalRoomId.current || roomId;
    if (!activeRoomId) return;
    socket.emit('game:undo-request', { roomId: activeRoomId, playerToken });
    alert('Đã gửi yêu cầu xin đi lại nước cờ tới đối thủ!');
  };

  const handleRespondUndo = (accept: boolean) => {
    const activeRoomId = canonicalRoomId.current || roomId;
    if (!activeRoomId) return;
    socket.emit('game:undo-response', { roomId: activeRoomId, playerToken, accept });
    setUndoOfferIncoming(false);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const activeRoomId = canonicalRoomId.current || roomId!;
    socket.emit('chat:send', {
      roomId: activeRoomId,
      playerToken,
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  // Determine top/bottom player based on orientation
  const isRedBottom = !isFlipped;
  const bottomPlayer = isRedBottom ? roomState?.players.RED : roomState?.players.BLACK;
  const topPlayer = isRedBottom ? roomState?.players.BLACK : roomState?.players.RED;
  const bottomColor: PlayerColor = isRedBottom ? 'RED' : 'BLACK';
  const topColor: PlayerColor = isRedBottom ? 'BLACK' : 'RED';
  const bottomTime = isRedBottom ? displayRedTime : displayBlackTime;
  const topTime = isRedBottom ? displayBlackTime : displayRedTime;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col p-2 sm:p-4 md:p-6">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto pb-3 mb-2 border-b border-stone-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-100 transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Trang chủ
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1">
            <span className="text-xs text-stone-400">Mã phòng:</span>
            <span className="font-mono font-bold text-amber-400 tracking-wider">
              {roomState?.code || '------'}
            </span>
            <button
              onClick={copyRoomCode}
              title="Sao chép mã phòng"
              className="ml-1 p-1 text-stone-400 hover:text-stone-100 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={copyRoomLink}
            className="hidden sm:flex items-center gap-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-3 py-1.5 rounded-lg transition-colors border border-stone-700"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Đã chép link' : 'Chép link mời'}
          </button>

          <button
            onClick={() => setIsFocusMode((prev) => !prev)}
            className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/60 text-sky-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-sky-800/60 font-semibold shadow-sm"
            title="Phóng to bàn cờ & Ẩn các thông tin xung quanh (Phím F)"
          >
            {isFocusMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Thu nhỏ (ESC)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Phóng to (F)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Board & Panels Layout */}
      <main
        className={`flex-1 w-full mx-auto transition-all duration-300 ${
          isFocusMode
            ? 'max-w-5xl flex flex-col items-center justify-center'
            : 'max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start justify-center'
        }`}
      >
        {/* Board Area with Player Headers */}
        <div
          className={`flex flex-col items-center w-full transition-all duration-300 ${
            isFocusMode ? 'w-full max-w-[850px]' : 'lg:col-span-8'
          }`}
        >
          {/* Top Player Card (Opponent) */}
          <div
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border mb-2 transition-all ${
              isFocusMode ? 'max-w-[850px]' : 'max-w-[600px]'
            } ${
              gameState?.currentTurn === topColor
                ? 'bg-stone-900 border-amber-500/50 shadow-lg'
                : 'bg-stone-900/60 border-stone-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  topColor === 'RED'
                    ? 'bg-red-950 text-red-400 border border-red-700'
                    : 'bg-stone-800 text-stone-300 border border-stone-600'
                }`}
              >
                {topColor === 'RED' ? '帥' : '將'}
              </div>
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  <span>{topPlayer?.name || 'Đang chờ đối thủ...'}</span>
                  {topPlayer && !topPlayer.isConnected && (
                    <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded border border-red-700 animate-pulse">
                      Mất kết nối
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-400">
                  {topColor === 'RED' ? 'Quân Đỏ (Đi trước)' : 'Quân Đen'}
                </div>
              </div>
            </div>

            {/* Top Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-lg border ${
                gameState?.currentTurn === topColor
                  ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                  : 'bg-stone-800/80 border-stone-700 text-stone-300'
              }`}
            >
              <Clock className="w-4 h-4 text-stone-400" />
              <span>{formatTime(topTime)}</span>
            </div>
          </div>

          {/* Fixed-Height Instruction & Status Bar (Prevents any board shifting) */}
          <div className={`w-full ${isFocusMode ? 'max-w-[850px]' : 'max-w-[600px]'} h-8 min-h-[32px] max-h-[32px] mb-2 flex items-center justify-center text-xs select-none transition-all`}>
            {roomState?.status === 'READY' && (
              myColor === 'BLACK' ? (
                // Guest perspective (Quân Đen)
                <div className="flex items-center justify-between w-full px-3 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300">
                  <span className="truncate">
                    {roomState.players.BLACK?.isReady
                      ? '✅ Bạn đã sẵn sàng! Đang chờ chủ phòng bắt đầu ván đấu...'
                      : '👉 Vui lòng bấm Sẵn sàng để chủ phòng bắt đầu trận:'}
                  </span>
                  <button
                    onClick={() => socket.emit('room:ready-toggle', { roomId: canonicalRoomId.current, playerToken })}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 shadow ${
                      roomState.players.BLACK?.isReady
                        ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 cursor-pointer'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse cursor-pointer'
                    }`}
                  >
                    {roomState.players.BLACK?.isReady ? 'Hủy sẵn sàng' : '✋ Bấm Sẵn sàng'}
                  </button>
                </div>
              ) : (
                // Host perspective (Quân Đỏ)
                <div className="flex items-center justify-between w-full px-3 py-1 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="truncate text-stone-300">
                    {roomState.players.BLACK?.isReady
                      ? '✅ Đối thủ đã sẵn sàng! Bạn có thể bấm bắt đầu:'
                      : '⏳ Đối thủ đã vào phòng (Đang chờ đối thủ bấm Sẵn sàng...)'}
                  </span>
                  <button
                    onClick={() => socket.emit('room:start-game', { roomId: canonicalRoomId.current, playerToken })}
                    disabled={!roomState.players.BLACK?.isReady}
                    className={`px-3.5 py-1 rounded-lg font-bold text-xs transition-all shrink-0 shadow ${
                      roomState.players.BLACK?.isReady
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 animate-pulse cursor-pointer'
                        : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    ▶ Bắt đầu ván đấu
                  </button>
                </div>
              )
            )}

            {roomState?.status === 'WAITING' && (
              <div className="flex items-center justify-between w-full px-3 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400">
                <span className="truncate">⏳ Đang chờ đối thủ vào phòng...</span>
                <button
                  onClick={copyRoomLink}
                  className="text-amber-400 hover:underline font-semibold text-[11px] shrink-0"
                >
                  Chép link mời
                </button>
              </div>
            )}

            {roomState?.status === 'ACTIVE' && (
              gameState?.isInCheck && gameState.checkedColor ? (
                <div className="flex items-center justify-center gap-1.5 w-full py-1 px-2 rounded-lg bg-red-900/70 border border-red-600 text-red-200 font-bold animate-pulse truncate">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>CHIẾU TƯỚNG! {gameState.checkedColor === 'RED' ? 'Tướng Đỏ' : 'Tướng Đen'} đang bị chiếu!</span>
                </div>
              ) : gameState?.currentTurn === myColor ? (
                <div className="flex items-center justify-center gap-2 w-full py-1 px-2 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 font-semibold truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                  <span>
                    {selectedCoord
                      ? '👉 Nhấp vào chấm xanh để đi hoặc vòng đỏ để ăn quân!'
                      : '👉 LƯỢT CỦA BẠN: Nhấp vào quân cờ của bạn để chọn nước đi.'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full py-1 px-2 rounded-lg bg-stone-900/70 border border-stone-800 text-stone-400 truncate">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                  <span>Đang chờ đối thủ suy nghĩ và thực hiện nước cờ...</span>
                </div>
              )
            )}
          </div>

          {/* The SVG Board */}
          <XiangqiBoard
            pieces={gameState?.pieces || []}
            currentTurn={gameState?.currentTurn || 'RED'}
            playerColor={myColor || undefined}
            isFlipped={isFlipped}
            selectedCoord={selectedCoord}
            legalTargets={legalTargets}
            lastMove={gameState?.lastMove || null}
            isInCheck={gameState?.isInCheck}
            checkedColor={gameState?.checkedColor}
            onIntersectionClick={handleIntersectionClick}
            disabled={roomState?.status !== 'ACTIVE'}
            className={isFocusMode ? 'w-full max-w-[820px] max-h-[80vh] mx-auto' : 'w-full max-w-[600px] mx-auto'}
            svgClassName={isFocusMode ? 'max-h-[80vh]' : 'max-h-[82vh]'}
          />

          {/* Bottom Player Card (You) */}
          <div
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border mt-2 transition-all ${
              isFocusMode ? 'max-w-[850px]' : 'max-w-[600px]'
            } ${
              gameState?.currentTurn === bottomColor
                ? 'bg-stone-900 border-amber-500/50 shadow-lg'
                : 'bg-stone-900/60 border-stone-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  bottomColor === 'RED'
                    ? 'bg-red-950 text-red-400 border border-red-700'
                    : 'bg-stone-800 text-stone-300 border border-stone-600'
                }`}
              >
                {bottomColor === 'RED' ? '帥' : '將'}
              </div>
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  <span>{bottomPlayer?.name || 'Bạn'}</span>
                  {myColor === bottomColor && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      Bạn
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-400">
                  {bottomColor === 'RED' ? 'Quân Đỏ' : 'Quân Đen'}
                </div>
              </div>
            </div>

            {/* Bottom Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-lg border ${
                gameState?.currentTurn === bottomColor
                  ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                  : 'bg-stone-800/80 border-stone-700 text-stone-300'
              }`}
            >
              <Clock className="w-4 h-4 text-stone-400" />
              <span>{formatTime(bottomTime)}</span>
            </div>
          </div>

          {/* Floating Action Controls in Focus Mode */}
          {isFocusMode && (
            <div className="w-full max-w-[850px] bg-stone-900/90 border border-stone-800 rounded-xl p-2.5 flex items-center justify-between gap-2 mt-2 shadow-lg">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs py-1.5 px-3 rounded-lg border border-stone-700 transition-colors"
                  title="Đảo chiều nhìn bàn cờ"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Đảo bàn cờ
                </button>

                {roomState?.allowUndo && (
                  <button
                    onClick={handleRequestUndo}
                    disabled={roomState?.status !== 'ACTIVE' || !gameState?.history.length}
                    className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs py-1.5 px-3 rounded-lg border border-stone-700 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-stone-400" />
                    Xin đi lại
                  </button>
                )}

                <button
                  onClick={handleOfferDraw}
                  disabled={roomState?.status !== 'ACTIVE'}
                  className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs py-1.5 px-3 rounded-lg border border-stone-700 transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  Xin hòa
                </button>

                <button
                  onClick={() => setConfirmResignOpen(true)}
                  disabled={roomState?.status !== 'ACTIVE'}
                  className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/50 disabled:opacity-40 text-red-300 text-xs py-1.5 px-3 rounded-lg border border-red-900/50 transition-colors"
                >
                  <Flag className="w-3.5 h-3.5 text-red-400" />
                  Đầu hàng
                </button>
              </div>

              <button
                onClick={() => setIsFocusMode(false)}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs py-1.5 px-3 rounded-lg border border-amber-500/30 font-semibold transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Thu nhỏ (ESC)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Controls, Move Log & Action Buttons */}
        {!isFocusMode && (
          <div className="lg:col-span-4 flex flex-col gap-4 w-full">
          {/* Action Toolbar */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex flex-wrap gap-2">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs py-2 px-3 rounded-lg border border-stone-700 transition-colors"
              title="Đảo chiều nhìn bàn cờ"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Đảo bàn cờ
            </button>

            {roomState?.allowUndo && (
              <button
                onClick={handleRequestUndo}
                disabled={roomState?.status !== 'ACTIVE' || !gameState?.history.length}
                className="flex-1 flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs py-2 px-3 rounded-lg border border-stone-700 transition-colors"
                title="Xin đi lại nước cờ"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Xin đi lại
              </button>
            )}

            <button
              onClick={handleOfferDraw}
              disabled={roomState?.status !== 'ACTIVE'}
              className="flex-1 flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 text-xs py-2 px-3 rounded-lg border border-stone-700 transition-colors"
              title="Gửi lời cầu hòa"
            >
              <Users className="w-3.5 h-3.5" />
              Xin hòa
            </button>

            <button
              onClick={() => setConfirmResignOpen(true)}
              disabled={roomState?.status !== 'ACTIVE'}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-950 hover:bg-red-900 disabled:opacity-40 text-red-200 text-xs py-2 px-3 rounded-lg border border-red-800 transition-colors"
              title="Xin nhận thua"
            >
              <Flag className="w-3.5 h-3.5" />
              Đầu hàng
            </button>
          </div>

          {/* Dual Tab Panel: Move History & In-Game Chat */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl flex flex-col h-[320px] overflow-hidden shadow-lg">
            {/* Tab Headers */}
            <div className="flex border-b border-stone-800 bg-stone-950/60">
              <button
                onClick={() => setSidebarTab('history')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  sidebarTab === 'history'
                    ? 'border-amber-500 text-amber-300 bg-stone-900/80'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Nước đi ({gameState?.history.length || 0})</span>
              </button>

              <button
                onClick={() => {
                  setSidebarTab('chat');
                  setUnreadChatCount(0);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors relative cursor-pointer ${
                  sidebarTab === 'chat'
                    ? 'border-amber-500 text-amber-300 bg-stone-900/80'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Trò chuyện</span>
                {unreadChatCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: History Content */}
            {sidebarTab === 'history' ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
                {gameState?.history && gameState.history.length > 0 ? (
                  gameState.history.map((move, idx) => {
                    const moveNum = Math.floor(idx / 2) + 1;
                    const isRedMove = idx % 2 === 0;
                    return (
                      <div
                        key={`hist-${idx}`}
                        className={`flex items-center justify-between px-2 py-1 rounded ${
                          idx === gameState.history.length - 1
                            ? 'bg-stone-800 text-amber-300 font-bold'
                            : 'text-stone-300 hover:bg-stone-800/50'
                        }`}
                      >
                        <span className="text-stone-500 w-6">{isRedMove ? `${moveNum}.` : ''}</span>
                        <span className={isRedMove ? 'text-red-400' : 'text-stone-300'}>
                          {isRedMove ? 'Đỏ' : 'Đen'}: ({move.from.x},{move.from.y}) → ({move.to.x},{move.to.y})
                        </span>
                        {move.capturedPiece && (
                          <span className="text-rose-400 text-[10px] bg-rose-950/60 px-1 rounded">
                            ăn {move.capturedPiece.type}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-stone-500 text-xs italic">
                    Chưa có nước đi nào
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: In-Game Chat Content */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-500 text-xs italic space-y-1">
                      <MessageSquare className="w-6 h-6 opacity-30 mb-1" />
                      <span>Chưa có tin nhắn nào.</span>
                      <span className="text-[11px] opacity-75">Gửi tin nhắn chào đối thủ của bạn!</span>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderColor === myColor;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-0.5 px-1">
                            <span className={msg.senderColor === 'RED' ? 'text-red-400 font-semibold' : 'text-stone-300 font-semibold'}>
                              {isMe ? 'Bạn' : msg.senderName} ({msg.senderColor === 'RED' ? 'Đỏ' : 'Đen'})
                            </span>
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs break-words shadow ${
                              isMe
                                ? 'bg-amber-600/30 text-amber-100 border border-amber-500/40 rounded-tr-none'
                                : 'bg-stone-800 text-stone-200 border border-stone-700 rounded-tl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSendChat}
                  className="flex items-center gap-1.5 p-2 bg-stone-950 border-t border-stone-800"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={200}
                    placeholder="Nhập tin nhắn... (Enter để gửi)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-stone-950 font-bold transition-colors cursor-pointer shrink-0"
                    title="Gửi tin nhắn"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Room Details Info Card */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between text-stone-400">
              <span>Chế độ thời gian:</span>
              <span className="capitalize font-semibold text-stone-200">
                {roomState?.timeControl} ({Math.floor((clock?.redTimeMs || 600000) / 60000)} phút)
              </span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Xin đi lại (Undo):</span>
              <span className="font-semibold text-stone-200">
                {roomState?.allowUndo ? 'Bật' : 'Tắt'}
              </span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Trạng thái phòng:</span>
              <span className="font-semibold text-amber-400 uppercase">
                {roomState?.status || 'Đang kết nối'}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>

      {/* Confirmation Modal: Resign */}
      {confirmResignOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl">
            <Flag className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Xác nhận đầu hàng?</h3>
            <p className="text-stone-400 text-xs mb-5">
              Bạn có chắc chắn muốn đầu hàng ván đấu này? Kết quả sẽ được tính thua cho bạn.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmResignOpen(false)}
                className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleResign}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Đầu hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Draw Offer Modal */}
      {drawOfferIncoming && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl">
            <Users className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Đối thủ cầu hòa</h3>
            <p className="text-stone-400 text-xs mb-5">
              Đối thủ vừa gửi lời đề nghị hòa cờ. Bạn có muốn chấp nhận kết quả hòa không?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRespondDraw(false)}
                className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold"
              >
                Từ chối
              </button>
              <button
                onClick={() => handleRespondDraw(true)}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Đồng ý hòa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Undo Offer Modal */}
      {undoOfferIncoming && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl">
            <Undo2 className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Đối thủ xin đi lại</h3>
            <p className="text-stone-400 text-xs mb-5">
              Đối thủ muốn rút lại nước cờ vừa đi. Bạn có chấp nhận cho đối thủ đi lại không?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRespondUndo(false)}
                className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold"
              >
                Không đồng ý
              </button>
              <button
                onClick={() => handleRespondUndo(true)}
                className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                Cho phép đi lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Finished Modal */}
      {roomState?.status === 'FINISHED' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-4">
              <span className="font-calligraphy text-3xl text-amber-400 font-bold">
                {roomState.winner === 'RED' ? '帥' : roomState.winner === 'BLACK' ? '將' : '和'}
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-1">
              {roomState.winner === null
                ? 'VÁN ĐẤU HÒA'
                : roomState.winner === myColor
                ? 'CHIẾN THẮNG!'
                : 'THUA CUỘC!'}
            </h2>

            <p className="text-stone-400 text-sm mb-6">
              {roomState.finishReason || 'Trận đấu đã kết thúc.'}
            </p>

            <div className="flex flex-col gap-2.5">
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 font-semibold text-sm transition-colors border border-stone-700"
                >
                  Về trang chủ
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-semibold text-sm text-stone-950 transition-colors"
                >
                  Chơi lại
                </button>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="w-full py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-400 font-semibold text-xs transition-colors border border-amber-500/30 flex items-center justify-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" /> Xem hồ sơ & Lịch sử đấu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Error Toast Notification - Completely outside layout flow to eliminate any board jitter */}
      {errorMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-950/95 border border-red-500/80 text-red-200 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 text-red-400 hover:text-red-100 font-bold p-0.5"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
