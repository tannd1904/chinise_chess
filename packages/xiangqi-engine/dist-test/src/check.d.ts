import { Piece, PlayerColor, PositionCoordinate } from '@xiangqi/shared-types';
import { BoardMap } from './board';
export declare function getPiecePseudoMoves(piece: Piece, board: BoardMap): PositionCoordinate[];
/**
 * Returns true if both generals are on the same column with no pieces between them.
 */
export declare function areGeneralsFacing(pieces: Piece[], board: BoardMap): boolean;
/**
 * Returns true if the general of the given color is under direct attack,
 * or if the generals are facing each other.
 */
export declare function isInCheck(pieces: Piece[], color: PlayerColor): boolean;
