"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XiangqiEngine = void 0;
const board_1 = require("./board");
const check_1 = require("./check");
const constants_1 = require("./constants");
class XiangqiEngine {
    /**
     * Generates all strictly legal moves for a piece at the given coordinate.
     */
    static getLegalMoves(pieces, from, currentTurn) {
        const board = new board_1.BoardMap(pieces);
        const piece = board.getPieceAt(from.x, from.y);
        if (!piece)
            return [];
        if (currentTurn && piece.color !== currentTurn)
            return [];
        const pseudoMoves = (0, check_1.getPiecePseudoMoves)(piece, board);
        const legalMoves = [];
        for (const to of pseudoMoves) {
            const { newPieces, capturedPiece } = (0, board_1.applyMoveToPieces)(pieces, from, to);
            // A move is strictly legal if own general is NOT in check
            if (!(0, check_1.isInCheck)(newPieces, piece.color)) {
                legalMoves.push({
                    from: { x: from.x, y: from.y },
                    to: { x: to.x, y: to.y },
                    capturedPiece,
                });
            }
        }
        return legalMoves;
    }
    /**
     * Generates all legal moves for all pieces of the specified color.
     */
    static getAllLegalMoves(pieces, color) {
        const legalMoves = [];
        const myPieces = pieces.filter((p) => p.color === color);
        for (const piece of myPieces) {
            const moves = this.getLegalMoves(pieces, { x: piece.x, y: piece.y }, color);
            legalMoves.push(...moves);
        }
        return legalMoves;
    }
    /**
     * Validates whether a specific move is legal for the current turn.
     */
    static validateMove(pieces, currentTurn, from, to) {
        const legalMoves = this.getLegalMoves(pieces, from, currentTurn);
        const found = legalMoves.find((m) => m.to.x === to.x && m.to.y === to.y);
        if (!found) {
            return { isValid: false, error: 'Illegal move according to Xiangqi rules' };
        }
        return { isValid: true, move: found };
    }
    /**
     * Applies a validated move, returns updated board pieces, next turn, and game status.
     */
    static applyMove(pieces, currentTurn, from, to) {
        const validation = this.validateMove(pieces, currentTurn, from, to);
        if (!validation.isValid || !validation.move) {
            throw new Error(validation.error || 'Invalid move');
        }
        const { newPieces, capturedPiece } = (0, board_1.applyMoveToPieces)(pieces, from, to);
        const nextTurn = currentTurn === 'RED' ? 'BLACK' : 'RED';
        // Evaluate next player's status
        const opponentInCheck = (0, check_1.isInCheck)(newPieces, nextTurn);
        const opponentLegalMoves = this.getAllLegalMoves(newPieces, nextTurn);
        let status = 'IN_PROGRESS';
        let winner = null;
        let checkedColor = null;
        if (opponentLegalMoves.length === 0) {
            if (opponentInCheck) {
                // Checkmate!
                status = 'CHECKMATE';
                winner = currentTurn;
                checkedColor = nextTurn;
            }
            else {
                // Stalemate: In Xiangqi, having no legal moves is an immediate loss!
                status = 'STALEMATE';
                winner = currentTurn;
            }
        }
        else if (opponentInCheck) {
            status = 'CHECK';
            checkedColor = nextTurn;
        }
        return {
            newPieces,
            capturedPiece,
            nextTurn,
            status,
            winner,
            inCheck: opponentInCheck,
            checkedColor,
        };
    }
    /**
     * Creates an initial snapshot of a fresh Xiangqi game.
     */
    static createInitialGameSnapshot() {
        return {
            pieces: (0, constants_1.createInitialPieces)(),
            currentTurn: 'RED',
            moveNumber: 1,
            status: 'IN_PROGRESS',
            winner: null,
            isInCheck: false,
            checkedColor: null,
            lastMove: null,
            history: [],
        };
    }
}
exports.XiangqiEngine = XiangqiEngine;
