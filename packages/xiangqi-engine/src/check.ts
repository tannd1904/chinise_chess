import { Piece, PlayerColor, PositionCoordinate } from '@xiangqi/shared-types';
import { BoardMap } from './board';
import { getGeneralPseudoMoves } from './moves/general';
import { getAdvisorPseudoMoves } from './moves/advisor';
import { getElephantPseudoMoves } from './moves/elephant';
import { getHorsePseudoMoves } from './moves/horse';
import { getChariotPseudoMoves } from './moves/chariot';
import { getCannonPseudoMoves } from './moves/cannon';
import { getSoldierPseudoMoves } from './moves/soldier';

export function getPiecePseudoMoves(piece: Piece, board: BoardMap): PositionCoordinate[] {
  switch (piece.type) {
    case 'GENERAL':
      return getGeneralPseudoMoves(piece, board);
    case 'ADVISOR':
      return getAdvisorPseudoMoves(piece, board);
    case 'ELEPHANT':
      return getElephantPseudoMoves(piece, board);
    case 'HORSE':
      return getHorsePseudoMoves(piece, board);
    case 'CHARIOT':
      return getChariotPseudoMoves(piece, board);
    case 'CANNON':
      return getCannonPseudoMoves(piece, board);
    case 'SOLDIER':
      return getSoldierPseudoMoves(piece, board);
    default:
      return [];
  }
}

/**
 * Returns true if both generals are on the same column with no pieces between them.
 */
export function areGeneralsFacing(pieces: Piece[], board: BoardMap): boolean {
  const redGeneral = pieces.find((p) => p.type === 'GENERAL' && p.color === 'RED');
  const blackGeneral = pieces.find((p) => p.type === 'GENERAL' && p.color === 'BLACK');

  if (!redGeneral || !blackGeneral) return false;
  if (redGeneral.x !== blackGeneral.x) return false;

  const col = redGeneral.x;
  const minY = Math.min(redGeneral.y, blackGeneral.y);
  const maxY = Math.max(redGeneral.y, blackGeneral.y);

  for (let y = minY + 1; y < maxY; y++) {
    if (board.isOccupied(col, y)) {
      return false; // Intervening piece found
    }
  }

  return true; // Flying generals!
}

/**
 * Returns true if the general of the given color is under direct attack,
 * or if the generals are facing each other.
 */
export function isInCheck(pieces: Piece[], color: PlayerColor): boolean {
  const board = new BoardMap(pieces);
  const general = pieces.find((p) => p.type === 'GENERAL' && p.color === color);

  if (!general) {
    // General missing -> technically considered defeated/checked
    return true;
  }

  // 1. Check Flying General
  if (areGeneralsFacing(pieces, board)) {
    return true;
  }

  // 2. Check all opponent pieces' attacks
  const opponentColor: PlayerColor = color === 'RED' ? 'BLACK' : 'RED';
  for (const piece of pieces) {
    if (piece.color === opponentColor) {
      const attacks = getPiecePseudoMoves(piece, board);
      for (const target of attacks) {
        if (target.x === general.x && target.y === general.y) {
          return true;
        }
      }
    }
  }

  return false;
}

