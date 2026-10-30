"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPiecePseudoMoves = getPiecePseudoMoves;
exports.areGeneralsFacing = areGeneralsFacing;
exports.isInCheck = isInCheck;
const board_1 = require("./board");
const general_1 = require("./moves/general");
const advisor_1 = require("./moves/advisor");
const elephant_1 = require("./moves/elephant");
const horse_1 = require("./moves/horse");
const chariot_1 = require("./moves/chariot");
const cannon_1 = require("./moves/cannon");
const soldier_1 = require("./moves/soldier");
function getPiecePseudoMoves(piece, board) {
    switch (piece.type) {
        case 'GENERAL':
            return (0, general_1.getGeneralPseudoMoves)(piece, board);
        case 'ADVISOR':
            return (0, advisor_1.getAdvisorPseudoMoves)(piece, board);
        case 'ELEPHANT':
            return (0, elephant_1.getElephantPseudoMoves)(piece, board);
        case 'HORSE':
            return (0, horse_1.getHorsePseudoMoves)(piece, board);
        case 'CHARIOT':
            return (0, chariot_1.getChariotPseudoMoves)(piece, board);
        case 'CANNON':
            return (0, cannon_1.getCannonPseudoMoves)(piece, board);
        case 'SOLDIER':
            return (0, soldier_1.getSoldierPseudoMoves)(piece, board);
        default:
            return [];
    }
}
/**
 * Returns true if both generals are on the same column with no pieces between them.
 */
function areGeneralsFacing(pieces, board) {
    const redGeneral = pieces.find((p) => p.type === 'GENERAL' && p.color === 'RED');
    const blackGeneral = pieces.find((p) => p.type === 'GENERAL' && p.color === 'BLACK');
    if (!redGeneral || !blackGeneral)
        return false;
    if (redGeneral.x !== blackGeneral.x)
        return false;
    const col = redGeneral.x;
    const minY = Math.min(redGeneral.y, blackGeneral.y);
    const maxY = Math.max(redGeneral.y, blackGeneral.y);
    for (let y = minY + 1; y < maxY; y++) {
        if (board.isOccupied(col, y)) {
            return false; // Intervening piece found
        }
    }
    return true; // Flying generals!
}
/**
 * Returns true if the general of the given color is under direct attack,
 * or if the generals are facing each other.
 */
function isInCheck(pieces, color) {
    const board = new board_1.BoardMap(pieces);
    const general = pieces.find((p) => p.type === 'GENERAL' && p.color === color);
    if (!general) {
        // General missing -> technically considered defeated/checked
        return true;
    }
    // 1. Check Flying General
    if (areGeneralsFacing(pieces, board)) {
        return true;
    }
    // 2. Check all opponent pieces' attacks
    const opponentColor = color === 'RED' ? 'BLACK' : 'RED';
    for (const piece of pieces) {
        if (piece.color === opponentColor) {
            const attacks = getPiecePseudoMoves(piece, board);
            for (const target of attacks) {
                if (target.x === general.x && target.y === general.y) {
                    return true;
                }
            }
        }
    }
    return false;
}
