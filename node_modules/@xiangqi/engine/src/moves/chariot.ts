import { Piece, PositionCoordinate } from '@xiangqi/shared-types';
import { BoardMap } from '../board';
import { isWithinBoard } from '../constants';

const ORTHOGONAL_DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

export function getChariotPseudoMoves(piece: Piece, board: BoardMap): PositionCoordinate[] {
  const moves: PositionCoordinate[] = [];

  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let currX = piece.x + dir.dx;
    let currY = piece.y + dir.dy;

    while (isWithinBoard(currX, currY)) {
      const targetPiece = board.getPieceAt(currX, currY);
      if (!targetPiece) {
        moves.push({ x: currX, y: currY });
      } else {
        if (targetPiece.color !== piece.color) {
          moves.push({ x: currX, y: currY });
        }
        break; // Chariot cannot jump over pieces
      }
      currX += dir.dx;
      currY += dir.dy;
    }
  }

  return moves;
}

