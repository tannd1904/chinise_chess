import { Piece, PositionCoordinate } from '@xiangqi/shared-types';
import { BoardMap } from '../board';
import { isWithinBoard, isWithinPalace } from '../constants';

export function getGeneralPseudoMoves(piece: Piece, board: BoardMap): PositionCoordinate[] {
  const moves: PositionCoordinate[] = [];
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (const dir of directions) {
    const targetX = piece.x + dir.dx;
    const targetY = piece.y + dir.dy;

    if (isWithinBoard(targetX, targetY) && isWithinPalace(targetX, targetY, piece.color)) {
      const targetPiece = board.getPieceAt(targetX, targetY);
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ x: targetX, y: targetY });
      }
    }
  }

  return moves;
}

