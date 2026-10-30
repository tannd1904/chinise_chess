import { GameSnapshot, GameStatus, Move, Piece, PlayerColor, PositionCoordinate } from '@xiangqi/shared-types';
export declare class XiangqiEngine {
    /**
     * Generates all strictly legal moves for a piece at the given coordinate.
     */
    static getLegalMoves(pieces: Piece[], from: PositionCoordinate, currentTurn?: PlayerColor): Move[];
    /**
     * Generates all legal moves for all pieces of the specified color.
     */
    static getAllLegalMoves(pieces: Piece[], color: PlayerColor): Move[];
    /**
     * Validates whether a specific move is legal for the current turn.
     */
    static validateMove(pieces: Piece[], currentTurn: PlayerColor, from: PositionCoordinate, to: PositionCoordinate): {
        isValid: boolean;
        move?: Move;
        error?: string;
    };
    /**
     * Applies a validated move, returns updated board pieces, next turn, and game status.
     */
    static applyMove(pieces: Piece[], currentTurn: PlayerColor, from: PositionCoordinate, to: PositionCoordinate): {
        newPieces: Piece[];
        capturedPiece?: Piece;
        nextTurn: PlayerColor;
        status: GameStatus;
        winner: PlayerColor | null;
        inCheck: boolean;
        checkedColor: PlayerColor | null;
    };
    /**
     * Creates an initial snapshot of a fresh Xiangqi game.
     */
    static createInitialGameSnapshot(): GameSnapshot;
}
