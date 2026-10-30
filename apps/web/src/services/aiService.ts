import {
  MinimaxAI,
  Evaluator,
  AIMoveResult,
  HintResult,
  AIDifficulty,
} from '@xiangqi/engine';
import { Move, Piece, PlayerColor } from '@xiangqi/shared-types';
import { WorkerRequest, WorkerResponse } from '../workers/ai.worker';

class AIService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private reqIdCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && window.Worker) {
      try {
        this.worker = new Worker(
          new URL('../workers/ai.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const { id, type, result, error } = e.data;
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            if (type === 'ERROR') {
              pending.reject(new Error(error || 'Worker error'));
            } else {
              pending.resolve(result);
            }
          }
        };

        this.worker.onerror = (err) => {
          console.error('AI Worker error:', err);
        };
      } catch (err) {
        console.warn('Could not initialize Web Worker, falling back to main thread AI:', err);
        this.worker = null;
      }
    }
  }

  public async getBestMove(
    pieces: Piece[],
    color: PlayerColor,
    difficulty: AIDifficulty,
    moveHistory: Move[]
  ): Promise<{ bestMove: AIMoveResult; evalScore: number }> {
    if (!this.worker) {
      // Fallback: synchronous compute in main thread
      const bestMove = MinimaxAI.getBestMove(pieces, color, difficulty, moveHistory);
      const evalScore = Evaluator.evaluate(pieces, 'RED');
      return { bestMove, evalScore };
    }

    const id = `req_${++this.reqIdCounter}`;
    const payload: WorkerRequest = {
      id,
      type: 'GET_BEST_MOVE',
      pieces,
      color,
      difficulty,
      moveHistory,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage(payload);
    });
  }

  public async getHint(pieces: Piece[], color: PlayerColor): Promise<HintResult> {
    if (!this.worker) {
      return MinimaxAI.getHint(pieces, color);
    }

    const id = `req_${++this.reqIdCounter}`;
    const payload: WorkerRequest = {
      id,
      type: 'GET_HINT',
      pieces,
      color,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage(payload);
    });
  }

  public async evaluate(pieces: Piece[]): Promise<number> {
    if (!this.worker) {
      return Evaluator.evaluate(pieces, 'RED');
    }

    const id = `req_${++this.reqIdCounter}`;
    const payload: WorkerRequest = {
      id,
      type: 'EVALUATE',
      pieces,
      color: 'RED',
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage(payload);
    });
  }
}

export const aiService = new AIService();

