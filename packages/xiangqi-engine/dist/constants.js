"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RED_PALACE = exports.BLACK_PALACE = exports.BOARD_HEIGHT = exports.BOARD_WIDTH = void 0;
exports.isWithinBoard = isWithinBoard;
exports.isWithinPalace = isWithinPalace;
exports.isAcrossRiver = isAcrossRiver;
exports.createInitialPieces = createInitialPieces;
exports.BOARD_WIDTH = 9; // x: 0..8
exports.BOARD_HEIGHT = 10; // y: 0..9
exports.BLACK_PALACE = {
    minX: 3,
    maxX: 5,
    minY: 0,
    maxY: 2,
};
exports.RED_PALACE = {
    minX: 3,
    maxX: 5,
    minY: 7,
    maxY: 9,
};
function isWithinBoard(x, y) {
    return x >= 0 && x < exports.BOARD_WIDTH && y >= 0 && y < exports.BOARD_HEIGHT;
}
function isWithinPalace(x, y, color) {
    if (color === 'BLACK') {
        return (x >= exports.BLACK_PALACE.minX &&
            x <= exports.BLACK_PALACE.maxX &&
            y >= exports.BLACK_PALACE.minY &&
            y <= exports.BLACK_PALACE.maxY);
    }
    return (x >= exports.RED_PALACE.minX &&
        x <= exports.RED_PALACE.maxX &&
        y >= exports.RED_PALACE.minY &&
        y <= exports.RED_PALACE.maxY);
}
function isAcrossRiver(y, color) {
    if (color === 'BLACK') {
        return y >= 5; // Black crosses river into rank 5..9
    }
    return y <= 4; // Red crosses river into rank 0..4
}
function createInitialPieces() {
    const pieces = [];
    let idCounter = 1;
    const add = (type, color, x, y) => {
        pieces.push({
            id: `${color.toLowerCase()}-${type.toLowerCase()}-${idCounter++}`,
            type,
            color,
            x,
            y,
        });
    };
    // Black Pieces (y = 0..3)
    // Rooks
    add('CHARIOT', 'BLACK', 0, 0);
    add('CHARIOT', 'BLACK', 8, 0);
    // Horses
    add('HORSE', 'BLACK', 1, 0);
    add('HORSE', 'BLACK', 7, 0);
    // Elephants
    add('ELEPHANT', 'BLACK', 2, 0);
    add('ELEPHANT', 'BLACK', 6, 0);
    // Advisors
    add('ADVISOR', 'BLACK', 3, 0);
    add('ADVISOR', 'BLACK', 5, 0);
    // General
    add('GENERAL', 'BLACK', 4, 0);
    // Cannons
    add('CANNON', 'BLACK', 1, 2);
    add('CANNON', 'BLACK', 7, 2);
    // Soldiers
    add('SOLDIER', 'BLACK', 0, 3);
    add('SOLDIER', 'BLACK', 2, 3);
    add('SOLDIER', 'BLACK', 4, 3);
    add('SOLDIER', 'BLACK', 6, 3);
    add('SOLDIER', 'BLACK', 8, 3);
    // Red Pieces (y = 6..9)
    // Rooks
    add('CHARIOT', 'RED', 0, 9);
    add('CHARIOT', 'RED', 8, 9);
    // Horses
    add('HORSE', 'RED', 1, 9);
    add('HORSE', 'RED', 7, 9);
    // Elephants
    add('ELEPHANT', 'RED', 2, 9);
    add('ELEPHANT', 'RED', 6, 9);
    // Advisors
    add('ADVISOR', 'RED', 3, 9);
    add('ADVISOR', 'RED', 5, 9);
    // General
    add('GENERAL', 'RED', 4, 9);
    // Cannons
    add('CANNON', 'RED', 1, 7);
    add('CANNON', 'RED', 7, 7);
    // Soldiers
    add('SOLDIER', 'RED', 0, 6);
    add('SOLDIER', 'RED', 2, 6);
    add('SOLDIER', 'RED', 4, 6);
    add('SOLDIER', 'RED', 6, 6);
    add('SOLDIER', 'RED', 8, 6);
    return pieces;
}
