import {
  ClockState,
  GameSnapshot,
  Piece,
  PlayerColor,
  PlayerInfo,
  RoomDetails,
  RoomStatus,
  TimeControlPreset,
} from '@xiangqi/shared-types';

export interface InternalPlayer extends PlayerInfo {
  socketId: string;
}

export interface HistoryEntry {
  gameState: GameSnapshot;
  clock: ClockState;
}

export interface InternalRoom {
  id: string;
  code: string;
  status: RoomStatus;
  timeControl: TimeControlPreset;
  allowUndo: boolean;
  players: {
    RED?: InternalPlayer;
    BLACK?: InternalPlayer;
  };
  spectatorSocketIds: Set<string>;
  gameState: GameSnapshot;
  clock: ClockState;
  historyStack: HistoryEntry[];
  pendingDrawOfferFrom: PlayerColor | null;
  pendingUndoOfferFrom: PlayerColor | null;
  winner: PlayerColor | null;
  finishReason: string | null;
  createdAt: number;
  gameStartedAt?: number;
}

