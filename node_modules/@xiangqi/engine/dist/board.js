"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardMap = void 0;
exports.clonePieces = clonePieces;
exports.applyMoveToPieces = applyMoveToPieces;
const constants_1 = require("./constants");
class BoardMap {
    constructor(pieces) {
        this.grid = Array.from({ length: 10 }, () => Array(9).fill(null));
        for (const piece of pieces) {
            if ((0, constants_1.isWithinBoard)(piece.x, piece.y)) {
                this.grid[piece.y][piece.x] = piece;
            }
        }
    }
    getPieceAt(x, y) {
        if (!(0, constants_1.isWithinBoard)(x, y))
            return null;
        return this.grid[y][x];
    }
    isOccupied(x, y) {
        return this.getPieceAt(x, y) !== null;
    }
}
exports.BoardMap = BoardMap;
function clonePieces(pieces) {
    return pieces.map((p) => ({ ...p }));
}
function applyMoveToPieces(pieces, from, to) {
    let capturedPiece;
    const newPieces = [];
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
        }
        else {
            newPieces.push({ ...p });
        }
    }
    return { newPieces, capturedPiece };
}
