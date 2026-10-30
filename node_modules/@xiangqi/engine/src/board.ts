import { Piece, PositionCoordinate } from '@xiangqi/shared-types';
import { isWithinBoard } from './constants';

export class BoardMap {
  private grid: (Piece | null)[][];

  constructor(pieces: Piece[]) {
    this.grid = Array.from({ length: 10 }, () => Array(9).fill(null));
    for (const piece of pieces) {
      if (isWithinBoard(piece.x, piece.y)) {
        this.grid[piece.y][piece.x] = piece;
      }
    }
  }

  public getPieceAt(x: number, y: number): Piece | null {
    if (!isWithinBoard(x, y)) return null;
    return this.grid[y][x];
  }

  public isOccupied(x: number, y: number): boolean {
    return this.getPieceAt(x, y) !== null;
  }
}

export function clonePieces(pieces: Piece[]): Piece[] {
  return pieces.map((p) => ({ ...p }));
}

export function applyMoveToPieces(
  pieces: Piece[],
  from: PositionCoordinate,
  to: PositionCoordinate
): { newPieces: Piece[]; capturedPiece?: Piece } {
  let capturedPiece: Piece | undefined;
  const newPieces: Piece[] = [];

  for (const p of pieces) {
    if (p.x === to.x && p.y === to.y) {
      capturedPiece = p;
      continue; // drop captured piece
    }
    if (p.x === from.x && p.y === from.y) {
      newPieces.push({
        ...p,
        x: to.x,
        y: to.y,
      });
    } else {
      newPieces.push({ ...p });
    }
  }

  return { newPieces, capturedPiece };
}

