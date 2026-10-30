import {
  Move,
  Piece,
  PlayerColor,
  PositionCoordinate,
} from '@xiangqi/shared-types';
import { XiangqiEngine } from '../engine';
import { applyMoveToPieces, BoardMap } from '../board';
import { isInCheck } from '../check';
import { PIECE_MATERIAL_VALUES, getPiecePSTValue } from './constants';
import { Evaluator } from './evaluator';
import { getBookMove } from './openingBook';

export type AIDifficulty = 1 | 2 | 3 | 4 | 'easy' | 'medium' | 'hard' | 'master';

export interface AIMoveResult {
  move: Move;
  score: number;
  depth: number;
  nodesEvaluated: number;
  fromBook?: boolean;
  bookName?: string;
}

export interface HintResult {
  move: Move;
  score: number;
  explanation: string;
}

export class MinimaxAI {
  private static readonly INFINITY = 1000000;
  private static readonly CHECKMATE_SCORE = 100000;

  /**
   * Evaluates and orders moves to maximize alpha-beta pruning cutoffs.
   * MVV-LVA (Most Valuable Victim - Least Valuable Attacker) for captures.
   */
  public static orderMoves(pieces: Piece[], moves: Move[], color: PlayerColor): Move[] {
    const board = new BoardMap(pieces);

    const scoredMoves = moves.map((move) => {
      let score = 0;
      const piece = board.getPieceAt(move.from.x, move.from.y);
      const target = board.getPieceAt(move.to.x, move.to.y);

      if (target) {
        // MVV-LVA: Victim value * 10 - Attacker value
        const victimValue = PIECE_MATERIAL_VALUES[target.type] || 0;
        const attackerValue = piece ? PIECE_MATERIAL_VALUES[piece.type] || 0 : 0;
        score = 10000 + victimValue * 10 - attackerValue;
      } else if (piece) {
        // Positional gain
        const pstBefore = getPiecePSTValue(piece.type, color, move.from.x, move.from.y);
        const pstAfter = getPiecePSTValue(piece.type, color, move.to.x, move.to.y);
        score = pstAfter - pstBefore;
      }

      return { move, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves.map((sm) => sm.move);
  }

  /**
   * Quiescence search: Continues evaluating captures only to avoid horizon effect.
   */
  private static quiescence(
    pieces: Piece[],
    alpha: number,
    beta: number,
    color: PlayerColor,
    ply: number,
    maxQDepth: number,
    stats: { nodes: number }
  ): number {
    stats.nodes++;
    const standPat = Evaluator.evaluate(pieces, color);

    if (ply >= maxQDepth) {
      return standPat;
    }

    if (standPat >= beta) {
      return beta;
    }

    if (standPat > alpha) {
      alpha = standPat;
    }

    // Generate only capture moves
    const allMoves = XiangqiEngine.getAllLegalMoves(pieces, color);
    const captureMoves = allMoves.filter((m) => m.capturedPiece);
    const orderedCaptures = this.orderMoves(pieces, captureMoves, color);

    const nextColor: PlayerColor = color === 'RED' ? 'BLACK' : 'RED';

    for (const move of orderedCaptures) {
      const { newPieces } = applyMoveToPieces(pieces, move.from, move.to);
      const score = -this.quiescence(
        newPieces,
        -beta,
        -alpha,
        nextColor,
        ply + 1,
        maxQDepth,
        stats
      );

      if (score >= beta) {
        return beta;
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  /**
   * Alpha-Beta Search Core
   */
  private static alphaBeta(
    pieces: Piece[],
    depth: number,
    alpha: number,
    beta: number,
    color: PlayerColor,
    ply: number,
    useQuiescence: boolean,
    stats: { nodes: number }
  ): number {
    stats.nodes++;

    if (depth <= 0) {
      if (useQuiescence) {
        return this.quiescence(pieces, alpha, beta, color, 0, 2, stats);
      }
      return Evaluator.evaluate(pieces, color);
    }

    const legalMoves = XiangqiEngine.getAllLegalMoves(pieces, color);
    if (legalMoves.length === 0) {
      // In Xiangqi, having no legal moves is loss (checkmate if in check, stalemate loss if not)
      return -this.CHECKMATE_SCORE + ply;
    }

    const orderedMoves = this.orderMoves(pieces, legalMoves, color);
    const nextColor: PlayerColor = color === 'RED' ? 'BLACK' : 'RED';

    for (const move of orderedMoves) {
      const { newPieces } = applyMoveToPieces(pieces, move.from, move.to);
      const score = -this.alphaBeta(
        newPieces,
        depth - 1,
        -beta,
        -alpha,
        nextColor,
        ply + 1,
        useQuiescence,
        stats
      );

      if (score >= beta) {
        return beta; // Prune
      }
      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  /**
   * Normalizes difficulty level string/number to 1, 2, 3, or 4
   */
  public static normalizeLevel(difficulty: AIDifficulty): 1 | 2 | 3 | 4 {
    if (typeof difficulty === 'number') {
      if (difficulty <= 1) return 1;
      if (difficulty === 2) return 2;
      if (difficulty === 3) return 3;
      return 4;
    }
    switch (difficulty) {
      case 'easy':
        return 1;
      case 'medium':
        return 2;
      case 'hard':
        return 3;
      case 'master':
        return 4;
      default:
        return 2;
    }
  }

  /**
   * Finds the best move for the specified color given current board pieces and history.
   */
  public static getBestMove(
    pieces: Piece[],
    color: PlayerColor,
    difficulty: AIDifficulty = 2,
    moveHistory: Move[] = []
  ): AIMoveResult {
    const level = this.normalizeLevel(difficulty);

    // 1. Level 4 (Master) attempts opening book first if early in the game
    if (level === 4 && moveHistory.length <= 8) {
      const bookMove = getBookMove(moveHistory);
      if (bookMove) {
        // Validate legality on current pieces
        const validation = XiangqiEngine.validateMove(
          pieces,
          color,
          bookMove.from,
          bookMove.to
        );
        if (validation.isValid && validation.move) {
          return {
            move: validation.move,
            score: 0,
            depth: 0,
            nodesEvaluated: 1,
            fromBook: true,
            bookName: bookMove.name,
          };
        }
      }
    }

    const legalMoves = XiangqiEngine.getAllLegalMoves(pieces, color);
    if (legalMoves.length === 0) {
      throw new Error(`No legal moves available for ${color}`);
    }

    // Determine search parameters based on level
    let searchDepth = 3;
    let useQuiescence = false;
    let randomProbability = 0;

    switch (level) {
      case 1:
        searchDepth = 1;
        randomProbability = 0.25; // 25% chance to make an uncalculated move
        break;
      case 2:
        searchDepth = 2;
        randomProbability = 0.05;
        break;
      case 3:
        searchDepth = 3;
        useQuiescence = true;
        break;
      case 4:
        searchDepth = 4;
        useQuiescence = true;
        break;
    }

    // Random move check for Level 1 (makes game accessible for beginners)
    if (randomProbability > 0 && Math.random() < randomProbability) {
      const randomIdx = Math.floor(Math.random() * legalMoves.length);
      return {
        move: legalMoves[randomIdx],
        score: 0,
        depth: searchDepth,
        nodesEvaluated: 1,
      };
    }

    const orderedMoves = this.orderMoves(pieces, legalMoves, color);
    const nextColor: PlayerColor = color === 'RED' ? 'BLACK' : 'RED';
    const stats = { nodes: 0 };

    let bestMove: Move = orderedMoves[0];
    let bestScore = -this.INFINITY;
    let alpha = -this.INFINITY;
    const beta = this.INFINITY;

    for (const move of orderedMoves) {
      const { newPieces } = applyMoveToPieces(pieces, move.from, move.to);
      const score = -this.alphaBeta(
        newPieces,
        searchDepth - 1,
        -beta,
        -alpha,
        nextColor,
        1,
        useQuiescence,
        stats
      );

      // Add slight jitter for lower levels to prevent repetitive matches
      const jitter = level === 1 ? (Math.random() * 20 - 10) : 0;
      const totalScore = score + jitter;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMove = move;
      }

      if (score > alpha) {
        alpha = score;
      }
    }

    return {
      move: bestMove,
      score: bestScore,
      depth: searchDepth,
      nodesEvaluated: stats.nodes,
    };
  }

  /**
   * Generates a hint recommendation with human-readable reasoning in Vietnamese.
   */
  public static getHint(pieces: Piece[], color: PlayerColor): HintResult {
    const result = this.getBestMove(pieces, color, 3);
    const move = result.move;

    const board = new BoardMap(pieces);
    const piece = board.getPieceAt(move.from.x, move.from.y);
    const target = board.getPieceAt(move.to.x, move.to.y);

    const { newPieces } = applyMoveToPieces(pieces, move.from, move.to);
    const enemyColor: PlayerColor = color === 'RED' ? 'BLACK' : 'RED';
    const givesCheck = isInCheck(newPieces, enemyColor);

    let explanation = '';
    const pieceNames: Record<string, string> = {
      GENERAL: 'Tướng',
      CHARIOT: 'Xe',
      CANNON: 'Pháo',
      HORSE: 'Mã',
      ELEPHANT: 'Tượng',
      ADVISOR: 'Sĩ',
      SOLDIER: 'Tốt / Binh',
    };

    const movingName = piece ? pieceNames[piece.type] : 'Quân cờ';

    if (givesCheck) {
      explanation = `Đi ${movingName} đến (${move.to.x}, ${move.to.y}) chiếu Tướng đối thủ, tạo sức ép mạnh mẽ!`;
    } else if (target) {
      const targetName = pieceNames[target.type] || 'quân đối phương';
      explanation = `Dùng ${movingName} bắt ${targetName} của đối thủ tại (${move.to.x}, ${move.to.y}) để chiếm ưu thế hơn quân.`;
    } else if (piece?.type === 'CHARIOT') {
      explanation = `Chiếm lộ thông thoáng (${move.to.x}) giúp Xe phát huy uy lực kiểm soát bàn cờ.`;
    } else if (piece?.type === 'HORSE') {
      explanation = `Mở đường cho Mã nhảy lên hướng trung tâm (${move.to.x}, ${move.to.y}), chuẩn bị phối hợp tấn công.`;
    } else if (piece?.type === 'CANNON') {
      explanation = `Điều Pháo đến vị trí chiến lược (${move.to.x}, ${move.to.y}) để găm cung và khống chế.`;
    } else if (piece?.type === 'SOLDIER') {
      explanation = `Tiến Binh/Tốt (${move.to.x}, ${move.to.y}) mở đường cho Mã và áp sát trận địa đối phương.`;
    } else {
      explanation = `Củng cố trận hình và phòng thủ an toàn cho cung Tướng.`;
    }

    return {
      move,
      score: result.score,
      explanation,
    };
  }
}
