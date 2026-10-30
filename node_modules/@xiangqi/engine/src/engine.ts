import {
  GameSnapshot,
  GameStatus,
  Move,
  Piece,
  PlayerColor,
  PositionCoordinate,
} from '@xiangqi/shared-types';
import { applyMoveToPieces, BoardMap } from './board';
import { isInCheck, getPiecePseudoMoves } from './check';
import { createInitialPieces } from './constants';

export class XiangqiEngine {
  /**
   * Generates all strictly legal moves for a piece at the given coordinate.
   */
  public static getLegalMoves(
    pieces: Piece[],
    from: PositionCoordinate,
    currentTurn?: PlayerColor
  ): Move[] {
    const board = new BoardMap(pieces);
    const piece = board.getPieceAt(from.x, from.y);

    if (!piece) return [];
    if (currentTurn && piece.color !== currentTurn) return [];

    const pseudoMoves = getPiecePseudoMoves(piece, board);
    const legalMoves: Move[] = [];

    for (const to of pseudoMoves) {
      const { newPieces, capturedPiece } = applyMoveToPieces(pieces, from, to);

      // A move is strictly legal if own general is NOT in check
      if (!isInCheck(newPieces, piece.color)) {
        legalMoves.push({
          from: { x: from.x, y: from.y },
          to: { x: to.x, y: to.y },
          capturedPiece,
        });
      }
    }

    return legalMoves;
  }

  /**
   * Generates all legal moves for all pieces of the specified color.
   */
  public static getAllLegalMoves(pieces: Piece[], color: PlayerColor): Move[] {
    const legalMoves: Move[] = [];
    const myPieces = pieces.filter((p) => p.color === color);

    for (const piece of myPieces) {
      const moves = this.getLegalMoves(pieces, { x: piece.x, y: piece.y }, color);
      legalMoves.push(...moves);
    }

    return legalMoves;
  }

  /**
   * Validates whether a specific move is legal for the current turn.
   */
  public static validateMove(
    pieces: Piece[],
    currentTurn: PlayerColor,
    from: PositionCoordinate,
    to: PositionCoordinate
  ): { isValid: boolean; move?: Move; error?: string } {
    const legalMoves = this.getLegalMoves(pieces, from, currentTurn);
    const found = legalMoves.find((m) => m.to.x === to.x && m.to.y === to.y);

    if (!found) {
      return { isValid: false, error: 'Illegal move according to Xiangqi rules' };
    }

    return { isValid: true, move: found };
  }

  /**
   * Applies a validated move, returns updated board pieces, next turn, and game status.
   */
  public static applyMove(
    pieces: Piece[],
    currentTurn: PlayerColor,
    from: PositionCoordinate,
    to: PositionCoordinate
  ): {
    newPieces: Piece[];
    capturedPiece?: Piece;
    nextTurn: PlayerColor;
    status: GameStatus;
    winner: PlayerColor | null;
    inCheck: boolean;
    checkedColor: PlayerColor | null;
  } {
    const validation = this.validateMove(pieces, currentTurn, from, to);
    if (!validation.isValid || !validation.move) {
      throw new Error(validation.error || 'Invalid move');
    }

    const { newPieces, capturedPiece } = applyMoveToPieces(pieces, from, to);
    const nextTurn: PlayerColor = currentTurn === 'RED' ? 'BLACK' : 'RED';

    // Evaluate next player's status
    const opponentInCheck = isInCheck(newPieces, nextTurn);
    const opponentLegalMoves = this.getAllLegalMoves(newPieces, nextTurn);

    let status: GameStatus = 'IN_PROGRESS';
    let winner: PlayerColor | null = null;
    let checkedColor: PlayerColor | null = null;

    if (opponentLegalMoves.length === 0) {
      if (opponentInCheck) {
        // Checkmate!
        status = 'CHECKMATE';
        winner = currentTurn;
        checkedColor = nextTurn;
      } else {
        // Stalemate: In Xiangqi, having no legal moves is an immediate loss!
        status = 'STALEMATE';
        winner = currentTurn;
      }
    } else if (opponentInCheck) {
      status = 'CHECK';
      checkedColor = nextTurn;
    }

    return {
      newPieces,
      capturedPiece,
      nextTurn,
      status,
      winner,
      inCheck: opponentInCheck,
      checkedColor,
    };
  }

  /**
   * Creates an initial snapshot of a fresh Xiangqi game.
   */
  public static createInitialGameSnapshot(): GameSnapshot {
    return {
      pieces: createInitialPieces(),
      currentTurn: 'RED',
      moveNumber: 1,
      status: 'IN_PROGRESS',
      winner: null,
      isInCheck: false,
      checkedColor: null,
      lastMove: null,
      history: [],
    };
  }
}
