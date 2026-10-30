"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSoldierPseudoMoves = getSoldierPseudoMoves;
const constants_1 = require("../constants");
function getSoldierPseudoMoves(piece, board) {
    const moves = [];
    const candidateSteps = [];
    if (piece.color === 'RED') {
        // Red moves forward (y decreases)
        candidateSteps.push({ dx: 0, dy: -1 });
        // If Red crossed river (y <= 4), can also move horizontally
        if (piece.y <= 4) {
            candidateSteps.push({ dx: -1, dy: 0 });
            candidateSteps.push({ dx: 1, dy: 0 });
        }
    }
    else {
        // Black moves forward (y increases)
        candidateSteps.push({ dx: 0, dy: 1 });
        // If Black crossed river (y >= 5), can also move horizontally
        if (piece.y >= 5) {
            candidateSteps.push({ dx: -1, dy: 0 });
            candidateSteps.push({ dx: 1, dy: 0 });
        }
    }
    for (const step of candidateSteps) {
        const targetX = piece.x + step.dx;
        const targetY = piece.y + step.dy;
        if ((0, constants_1.isWithinBoard)(targetX, targetY)) {
            const targetPiece = board.getPieceAt(targetX, targetY);
            if (!targetPiece || targetPiece.color !== piece.color) {
                moves.push({ x: targetX, y: targetY });
            }
        }
    }
    return moves;
}
