import { Piece, PositionCoordinate } from '@xiangqi/shared-types';
import { BoardMap } from '../board';
import { isWithinBoard } from '../constants';

interface HorseMovePattern {
  leg: { dx: number; dy: number };
  destinations: { dx: number; dy: number }[];
}

const HORSE_PATTERNS: HorseMovePattern[] = [
  // Upwards leg
  {
    leg: { dx: 0, dy: -1 },
    destinations: [
      { dx: -1, dy: -2 },
      { dx: 1, dy: -2 },
    ],
  },
  // Downwards leg
  {
    leg: { dx: 0, dy: 1 },
    destinations: [
      { dx: -1, dy: 2 },
      { dx: 1, dy: 2 },
    ],
  },
  // Leftwards leg
  {
    leg: { dx: -1, dy: 0 },
    destinations: [
      { dx: -2, dy: -1 },
      { dx: -2, dy: 1 },
    ],
  },
  // Rightwards leg
  {
    leg: { dx: 1, dy: 0 },
    destinations: [
      { dx: 2, dy: -1 },
      { dx: 2, dy: 1 },
    ],
  },
];

export function getHorsePseudoMoves(piece: Piece, board: BoardMap): PositionCoordinate[] {
  const moves: PositionCoordinate[] = [];

  for (const pattern of HORSE_PATTERNS) {
    const legX = piece.x + pattern.leg.dx;
    const legY = piece.y + pattern.leg.dy;

    // If horse leg is blocked or off board, horse cannot move in these directions
    if (!isWithinBoard(legX, legY) || board.isOccupied(legX, legY)) {
      continue;
    }

    for (const dest of pattern.destinations) {
      const targetX = piece.x + dest.dx;
      const targetY = piece.y + dest.dy;

      if (isWithinBoard(targetX, targetY)) {
        const targetPiece = board.getPieceAt(targetX, targetY);
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push({ x: targetX, y: targetY });
        }
      }
    }
  }

  return moves;
}

