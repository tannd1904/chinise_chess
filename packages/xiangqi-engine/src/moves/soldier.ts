import { Piece, PositionCoordinate } from '@xiangqi/shared-types';
import { BoardMap } from '../board';
import { isWithinBoard } from '../constants';

export function getSoldierPseudoMoves(piece: Piece, board: BoardMap): PositionCoordinate[] {
  const moves: PositionCoordinate[] = [];
  const candidateSteps: { dx: number; dy: number }[] = [];

  if (piece.color === 'RED') {
    // Red moves forward (y decreases)
    candidateSteps.push({ dx: 0, dy: -1 });

    // If Red crossed river (y <= 4), can also move horizontally
    if (piece.y <= 4) {
      candidateSteps.push({ dx: -1, dy: 0 });
      candidateSteps.push({ dx: 1, dy: 0 });
    }
  } else {
    // Black moves forward (y increases)
    candidateSteps.push({ dx: 0, dy: 1 });

    // If Black crossed river (y >= 5), can also move horizontally
    if (piece.y >= 5) {
      candidateSteps.push({ dx: -1, dy: 0 });
      candidateSteps.push({ dx: 1, dy: 0 });
    }
  }

  for (const step of candidateSteps) {
    const targetX = piece.x + step.dx;
    const targetY = piece.y + step.dy;

    if (isWithinBoard(targetX, targetY)) {
      const targetPiece = board.getPieceAt(targetX, targetY);
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ x: targetX, y: targetY });
      }
    }
  }

  return moves;
}

