"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getElephantPseudoMoves = getElephantPseudoMoves;
const constants_1 = require("../constants");
function getElephantPseudoMoves(piece, board) {
    const moves = [];
    const directions = [
        { dx: 2, dy: 2 },
        { dx: 2, dy: -2 },
        { dx: -2, dy: 2 },
        { dx: -2, dy: -2 },
    ];
    for (const dir of directions) {
        const targetX = piece.x + dir.dx;
        const targetY = piece.y + dir.dy;
        // Check board boundary
        if (!(0, constants_1.isWithinBoard)(targetX, targetY))
            continue;
        // River boundary: Elephants cannot cross river
        if (piece.color === 'BLACK' && targetY > 4)
            continue;
        if (piece.color === 'RED' && targetY < 5)
            continue;
        // Elephant eye (intermediate point)
        const eyeX = piece.x + dir.dx / 2;
        const eyeY = piece.y + dir.dy / 2;
        if (board.isOccupied(eyeX, eyeY))
            continue; // Blocked eye!
        const targetPiece = board.getPieceAt(targetX, targetY);
        if (!targetPiece || targetPiece.color !== piece.color) {
            moves.push({ x: targetX, y: targetY });
        }
    }
    return moves;
}
