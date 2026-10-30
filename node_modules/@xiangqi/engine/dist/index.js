"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialPieces = exports.isAcrossRiver = exports.isWithinPalace = exports.isWithinBoard = exports.RED_PALACE = exports.BLACK_PALACE = exports.BOARD_HEIGHT = exports.BOARD_WIDTH = exports.applyMoveToPieces = exports.BoardMap = exports.getPiecePseudoMoves = exports.areGeneralsFacing = exports.isInCheck = exports.XiangqiEngine = void 0;
var engine_1 = require("./engine");
Object.defineProperty(exports, "XiangqiEngine", { enumerable: true, get: function () { return engine_1.XiangqiEngine; } });
var check_1 = require("./check");
Object.defineProperty(exports, "isInCheck", { enumerable: true, get: function () { return check_1.isInCheck; } });
Object.defineProperty(exports, "areGeneralsFacing", { enumerable: true, get: function () { return check_1.areGeneralsFacing; } });
Object.defineProperty(exports, "getPiecePseudoMoves", { enumerable: true, get: function () { return check_1.getPiecePseudoMoves; } });
var board_1 = require("./board");
Object.defineProperty(exports, "BoardMap", { enumerable: true, get: function () { return board_1.BoardMap; } });
Object.defineProperty(exports, "applyMoveToPieces", { enumerable: true, get: function () { return board_1.applyMoveToPieces; } });
var constants_1 = require("./constants");
Object.defineProperty(exports, "BOARD_WIDTH", { enumerable: true, get: function () { return constants_1.BOARD_WIDTH; } });
Object.defineProperty(exports, "BOARD_HEIGHT", { enumerable: true, get: function () { return constants_1.BOARD_HEIGHT; } });
Object.defineProperty(exports, "BLACK_PALACE", { enumerable: true, get: function () { return constants_1.BLACK_PALACE; } });
Object.defineProperty(exports, "RED_PALACE", { enumerable: true, get: function () { return constants_1.RED_PALACE; } });
Object.defineProperty(exports, "isWithinBoard", { enumerable: true, get: function () { return constants_1.isWithinBoard; } });
Object.defineProperty(exports, "isWithinPalace", { enumerable: true, get: function () { return constants_1.isWithinPalace; } });
Object.defineProperty(exports, "isAcrossRiver", { enumerable: true, get: function () { return constants_1.isAcrossRiver; } });
Object.defineProperty(exports, "createInitialPieces", { enumerable: true, get: function () { return constants_1.createInitialPieces; } });
__exportStar(require("./moves/general"), exports);
__exportStar(require("./moves/advisor"), exports);
__exportStar(require("./moves/elephant"), exports);
__exportStar(require("./moves/horse"), exports);
__exportStar(require("./moves/chariot"), exports);
__exportStar(require("./moves/cannon"), exports);
__exportStar(require("./moves/soldier"), exports);
