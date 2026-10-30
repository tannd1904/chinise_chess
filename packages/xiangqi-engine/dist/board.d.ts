import { Piece, PositionCoordinate } from '@xiangqi/shared-types';
export declare class BoardMap {
    private grid;
    constructor(pieces: Piece[]);
    getPieceAt(x: number, y: number): Piece | null;
    isOccupied(x: number, y: number): boolean;
}
export declare function clonePieces(pieces: Piece[]): Piece[];
export declare function applyMoveToPieces(pieces: Piece[], from: PositionCoordinate, to: PositionCoordinate): {
    newPieces: Piece[];
    capturedPiece?: Piece;
};
