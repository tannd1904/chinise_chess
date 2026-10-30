import { MinimaxAI, Evaluator, AIDifficulty } from '@xiangqi/engine';
import { Move, Piece, PlayerColor } from '@xiangqi/shared-types';

export interface WorkerRequest {
  id: string;
  type: 'GET_BEST_MOVE' | 'GET_HINT' | 'EVALUATE';
  pieces: Piece[];
  color: PlayerColor;
  difficulty?: AIDifficulty;
  moveHistory?: Move[];
}

export interface WorkerResponse {
  id: string;
  type: 'BEST_MOVE_SUCCESS' | 'HINT_SUCCESS' | 'EVALUATE_SUCCESS' | 'ERROR';
  result?: any;
  error?: string;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, type, pieces, color, difficulty = 2, moveHistory = [] } = e.data;

  try {
    if (type === 'GET_BEST_MOVE') {
      const bestMove = MinimaxAI.getBestMove(pieces, color, difficulty, moveHistory);
      const evalScore = Evaluator.evaluate(pieces, 'RED');
      const response: WorkerResponse = {
        id,
        type: 'BEST_MOVE_SUCCESS',
        result: { bestMove, evalScore },
      };
      self.postMessage(response);
    } else if (type === 'GET_HINT') {
      const hint = MinimaxAI.getHint(pieces, color);
      const response: WorkerResponse = {
        id,
        type: 'HINT_SUCCESS',
        result: hint,
      };
      self.postMessage(response);
    } else if (type === 'EVALUATE') {
      const score = Evaluator.evaluate(pieces, 'RED');
      const response: WorkerResponse = {
        id,
        type: 'EVALUATE_SUCCESS',
        result: score,
      };
      self.postMessage(response);
    }
  } catch (err: any) {
    const errorResponse: WorkerResponse = {
      id,
      type: 'ERROR',
      error: err?.message || 'AI computation failed',
    };
    self.postMessage(errorResponse);
  }
};

