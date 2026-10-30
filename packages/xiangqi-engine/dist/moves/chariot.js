"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChariotPseudoMoves = getChariotPseudoMoves;
const constants_1 = require("../constants");
const ORTHOGONAL_DIRECTIONS = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
];
function getChariotPseudoMoves(piece, board) {
    const moves = [];
    for (const dir of ORTHOGONAL_DIRECTIONS) {
        let currX = piece.x + dir.dx;
        let currY = piece.y + dir.dy;
        while ((0, constants_1.isWithinBoard)(currX, currY)) {
            const targetPiece = board.getPieceAt(currX, currY);
            if (!targetPiece) {
                moves.push({ x: currX, y: currY });
            }
            else {
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
