export type PlayerColor = 'RED' | 'BLACK';

export type PieceType =
  | 'GENERAL'  // 帥 / 將
  | 'ADVISOR'  // 仕 / 士
  | 'ELEPHANT' // 相 / 象
  | 'HORSE'    // 傌 / 馬
  | 'CHARIOT'  // 俥 / 車
  | 'CANNON'   // 炮 / 砲
  | 'SOLDIER'; // 兵 / 卒

export interface PositionCoordinate {
  x: number; // 0 to 8
  y: number; // 0 to 9
}

export interface Piece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  x: number;
  y: number;
}

export interface Move {
  from: PositionCoordinate;
  to: PositionCoordinate;
  capturedPiece?: Piece;
}

export type GameStatus =
  | 'IN_PROGRESS'
  | 'CHECK'
  | 'CHECKMATE'
  | 'STALEMATE'
  | 'RESIGNED'
  | 'TIMEOUT'
  | 'DRAW';

export interface GameSnapshot {
  pieces: Piece[];
  currentTurn: PlayerColor;
  moveNumber: number;
  status: GameStatus;
  winner: PlayerColor | null;
  isInCheck: boolean;
  checkedColor: PlayerColor | null;
  lastMove: Move | null;
  history: Move[];
}

export type TimeControlPreset = 'blitz' | 'rapid' | 'standard';

export interface ClockState {
  redTimeMs: number;
  blackTimeMs: number;
  currentTurn: PlayerColor;
  turnStartedAt: number;
  isPaused: boolean;
}

export type RoomStatus = 'WAITING' | 'READY' | 'ACTIVE' | 'FINISHED';

export interface PlayerInfo {
  id: string;
  userId?: string;
  token: string;
  name: string;
  color: PlayerColor;
  isReady: boolean;
  isConnected: boolean;
}

export interface RoomDetails {
  id: string;
  code: string;
  status: RoomStatus;
  timeControl: TimeControlPreset;
  allowUndo: boolean;
  players: {
    RED?: PlayerInfo;
    BLACK?: PlayerInfo;
  };
  spectators: number;
  createdAt: number;
  winner?: PlayerColor | null;
  finishReason?: string;
}

export interface ChatMessage {
  id: string;
  senderColor: PlayerColor;
  senderName: string;
  text: string;
  timestamp: number;
}

// Socket Events
export interface ClientToServerEvents {
  'room:create': (payload: { playerName: string; timeControl: TimeControlPreset; allowUndo: boolean; userId?: string }) => void;
  'room:join': (payload: { roomIdOrCode: string; playerName: string; playerToken?: string; userId?: string }) => void;
  'room:leave': (payload: { roomId: string; playerToken: string }) => void;
  'room:ready-toggle': (payload: { roomId: string; playerToken: string }) => void;
  'room:start-game': (payload: { roomId: string; playerToken: string }) => void;
  'game:ready': (payload: { roomId: string; playerToken: string }) => void;
  'game:move': (payload: { roomId: string; playerToken: string; from: PositionCoordinate; to: PositionCoordinate; moveNumber: number }) => void;
  'game:resign': (payload: { roomId: string; playerToken: string }) => void;
  'game:draw-offer': (payload: { roomId: string; playerToken: string }) => void;
  'game:draw-response': (payload: { roomId: string; playerToken: string; accept: boolean }) => void;
  'game:undo-request': (payload: { roomId: string; playerToken: string }) => void;
  'game:undo-response': (payload: { roomId: string; playerToken: string; accept: boolean }) => void;
  'game:reconnect': (payload: { roomId: string; playerToken: string }) => void;
  'chat:send': (payload: { roomId: string; playerToken: string; message: string }) => void;
  'matchmaking:queue': (payload: { playerName: string; timeControl: TimeControlPreset; userId?: string }) => void;
  'matchmaking:cancel': () => void;
}

export interface ServerToClientEvents {
  'room:created': (payload: { roomId: string; roomCode: string; playerToken: string; color: PlayerColor; roomState: RoomDetails }) => void;
  'room:joined': (payload: { roomId: string; roomCode: string; playerToken: string; color: PlayerColor; roomState: RoomDetails; gameState?: GameSnapshot; clock?: ClockState }) => void;
  'room:updated': (payload: { roomState: RoomDetails }) => void;
  'game:started': (payload: { roomState: RoomDetails; gameState: GameSnapshot; clock: ClockState }) => void;
  'game:move-accepted': (payload: { move: Move; nextTurn: PlayerColor; moveNumber: number; gameState: GameSnapshot; clock: ClockState }) => void;
  'game:move-rejected': (payload: { reason: string; code: string }) => void;
  'game:check': (payload: { checkedColor: PlayerColor }) => void;
  'game:finished': (payload: { winner: PlayerColor | null; reason: string; gameState: GameSnapshot }) => void;
  'game:draw-offered': (payload: { fromColor: PlayerColor }) => void;
  'game:draw-declined': (payload: { fromColor: PlayerColor }) => void;
  'game:undo-offered': (payload: { fromColor: PlayerColor }) => void;
  'game:undo-resolved': (payload: { accepted: boolean; gameState?: GameSnapshot; clock?: ClockState; reason?: string }) => void;
  'game:clock': (payload: { redTimeMs: number; blackTimeMs: number; currentTurn: PlayerColor }) => void;
  'player:disconnected': (payload: { color: PlayerColor; gracePeriodMs: number }) => void;
  'player:reconnected': (payload: { color: PlayerColor }) => void;
  'chat:message': (payload: ChatMessage) => void;
  'matchmaking:queued': (payload: { timeControl: TimeControlPreset; currentElo: number; searchRange: number }) => void;
  'matchmaking:status': (payload: { elapsedSec: number; searchRange: number }) => void;
  'matchmaking:matched': (payload: { roomId: string; roomCode: string; playerToken: string; color: PlayerColor; opponentName: string; opponentElo: number }) => void;
  'matchmaking:cancelled': () => void;
  'error': (payload: { message: string; code: string }) => void;
}

// User & Auth
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  eloRating: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  winRate: number; // percentage e.g. 55.5
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

// Match Persistence & Replay
export interface SavedMatchMove {
  id: string;
  moveNumber: number;
  playerColor: PlayerColor;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  capturedPiece?: string | null;
  createdAt: string;
}

export interface SavedMatchSummary {
  id: string;
  roomCode: string;
  redPlayerId?: string | null;
  blackPlayerId?: string | null;
  redPlayerName: string;
  blackPlayerName: string;
  status: string;
  result: 'RED_WIN' | 'BLACK_WIN' | 'DRAW';
  winnerColor?: PlayerColor | null;
  terminationReason: string;
  timeControl: string;
  totalMoves: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface SavedMatchDetail extends SavedMatchSummary {
  moves: SavedMatchMove[];
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  eloRating: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  winRate: number;
}

// Matchmaking Types
export interface MatchmakingQueueEntry {
  socketId: string;
  playerName: string;
  userId?: string;
  eloRating: number;
  timeControl: TimeControlPreset;
  joinedAt: number;
}
