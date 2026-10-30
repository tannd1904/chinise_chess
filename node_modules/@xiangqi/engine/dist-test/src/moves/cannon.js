"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCannonPseudoMoves = getCannonPseudoMoves;
const constants_1 = require("../constants");
const ORTHOGONAL_DIRECTIONS = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
];
function getCannonPseudoMoves(piece, board) {
    const moves = [];
    for (const dir of ORTHOGONAL_DIRECTIONS) {
        let currX = piece.x + dir.dx;
        let currY = piece.y + dir.dy;
        let screenFound = false;
        while ((0, constants_1.isWithinBoard)(currX, currY)) {
            const targetPiece = board.getPieceAt(currX, currY);
            if (!screenFound) {
                if (!targetPiece) {
                    // Normal non-capturing move before meeting any screen
                    moves.push({ x: currX, y: currY });
                }
                else {
                    // Met first piece: acts as the screen (ngòi pháo)
                    screenFound = true;
                }
            }
            else {
                // Looking for capture after the screen
                if (targetPiece) {
                    if (targetPiece.color !== piece.color) {
                        // Can capture enemy piece over the screen
                        moves.push({ x: currX, y: currY });
                    }
                    break; // Ray terminates upon hitting second piece
                }
            }
            currX += dir.dx;
            currY += dir.dy;
        }
    }
    return moves;
}
