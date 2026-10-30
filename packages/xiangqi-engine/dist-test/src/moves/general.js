"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeneralPseudoMoves = getGeneralPseudoMoves;
const constants_1 = require("../constants");
function getGeneralPseudoMoves(piece, board) {
    const moves = [];
    const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
    ];
    for (const dir of directions) {
        const targetX = piece.x + dir.dx;
        const targetY = piece.y + dir.dy;
        if ((0, constants_1.isWithinBoard)(targetX, targetY) && (0, constants_1.isWithinPalace)(targetX, targetY, piece.color)) {
            const targetPiece = board.getPieceAt(targetX, targetY);
            if (!targetPiece || targetPiece.color !== piece.color) {
                moves.push({ x: targetX, y: targetY });
            }
        }
    }
    return moves;
}
