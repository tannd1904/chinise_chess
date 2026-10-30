import { Piece, PlayerColor } from '@xiangqi/shared-types';
export declare const BOARD_WIDTH = 9;
export declare const BOARD_HEIGHT = 10;
export declare const BLACK_PALACE: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};
export declare const RED_PALACE: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};
export declare function isWithinBoard(x: number, y: number): boolean;
export declare function isWithinPalace(x: number, y: number, color: PlayerColor): boolean;
export declare function isAcrossRiver(y: number, color: PlayerColor): boolean;
export declare function createInitialPieces(): Piece[];
