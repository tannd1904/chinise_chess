"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const engine_1 = require("../src/engine");
const check_1 = require("../src/check");
const constants_1 = require("../src/constants");
const board_1 = require("../src/board");
console.log('--- RUNNING XIANGQI ENGINE TEST SUITE ---');
// Test 1: Initial Board Setup
{
    const initialPieces = (0, constants_1.createInitialPieces)();
    assert_1.default.strictEqual(initialPieces.length, 32, 'Initial piece count must be 32');
    const redPieces = initialPieces.filter((p) => p.color === 'RED');
    const blackPieces = initialPieces.filter((p) => p.color === 'BLACK');
    assert_1.default.strictEqual(redPieces.length, 16, 'Red must have 16 pieces');
    assert_1.default.strictEqual(blackPieces.length, 16, 'Black must have 16 pieces');
    // Verify Generals
    const redGeneral = redPieces.find((p) => p.type === 'GENERAL');
    const blackGeneral = blackPieces.find((p) => p.type === 'GENERAL');
    assert_1.default.deepStrictEqual({ x: redGeneral?.x, y: redGeneral?.y }, { x: 4, y: 9 }, 'Red General at (4,9)');
    assert_1.default.deepStrictEqual({ x: blackGeneral?.x, y: blackGeneral?.y }, { x: 4, y: 0 }, 'Black General at (4,0)');
    // Verify initial legal moves for Red:
    // Red has: 2 horses (2 moves each = 4), 2 cannons (move left/right or up = 12 total), 5 soldiers (1 forward each = 5)
    // Total moves = 4 + (2*12) = wait, cannons:
    // Left cannon (1,7) can move: (1,8) down, up to (1,3..6)=4, left to (0,7)=1, right to (2..6,7)=5 -> 1+4+1+5 = 11 moves?
    const allRedLegal = engine_1.XiangqiEngine.getAllLegalMoves(initialPieces, 'RED');
    assert_1.default.ok(allRedLegal.length > 0, 'Red must have legal opening moves');
    console.log('✓ Test 1: Initial board setup verified with', allRedLegal.length, 'opening moves');
}
// Test 2: General Movement & Flying General Rule
{
    // When file 5 has an intervening piece, Red General at (4,9) can move to (3,9), (4,8), and (5,9)
    const piecesWithIntervention = [
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
        { id: 'intervener', type: 'SOLDIER', color: 'RED', x: 5, y: 4 }, // Blocks sight line on file 5
    ];
    const movesWithIntervention = engine_1.XiangqiEngine.getLegalMoves(piecesWithIntervention, { x: 4, y: 9 }, 'RED');
    assert_1.default.strictEqual(movesWithIntervention.length, 3, 'Red general has 3 moves when file 5 sight line is blocked');
    // Without intervention on file 5, moving to (5,9) exposes flying general with (5,0), so only 2 moves remain
    const piecesOpenLine = [
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    const movesOpenLine = engine_1.XiangqiEngine.getLegalMoves(piecesOpenLine, { x: 4, y: 9 }, 'RED');
    assert_1.default.strictEqual(movesOpenLine.length, 2, 'Flying general rule correctly eliminates (5,9)');
    assert_1.default.ok(!movesOpenLine.some((m) => m.to.x === 5 && m.to.y === 9), 'Moving to (5,9) forbidden');
    // Direct facing on same file:
    const facingPieces = [
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 4, y: 0 },
    ];
    const board = new board_1.BoardMap(facingPieces);
    assert_1.default.strictEqual((0, check_1.areGeneralsFacing)(facingPieces, board), true, 'Generals detected as facing');
    // Red cannot stay in file 4 facing Black general
    const redMovesFacing = engine_1.XiangqiEngine.getLegalMoves(facingPieces, { x: 4, y: 9 }, 'RED');
    assert_1.default.ok(redMovesFacing.every((m) => m.to.x !== 4), 'Red General cannot make move keeping generals facing');
    console.log('✓ Test 2: General palace boundaries & Flying General rule verified');
}
// Test 3: Advisor Diagonal & Palace bounds
{
    const pieces = [
        { id: 'r-adv', type: 'ADVISOR', color: 'RED', x: 4, y: 8 },
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    const moves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 4, y: 8 }, 'RED');
    // From (4,8) advisor can go to 4 palace corners: (3,7), (5,7), (3,9), (5,9)
    assert_1.default.strictEqual(moves.length, 4, 'Center advisor has 4 diagonal moves');
    console.log('✓ Test 3: Advisor movement verified');
}
// Test 4: Elephant Diagonal 2 Steps, River Limit, Obstacle (Elephant Eye)
{
    // Red elephant at (2,9), open board
    const pieces = [
        { id: 'r-ele', type: 'ELEPHANT', color: 'RED', x: 2, y: 9 },
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    let moves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 2, y: 9 }, 'RED');
    // Can go to (0,7) or (4,7)
    assert_1.default.strictEqual(moves.length, 2, 'Red elephant at (2,9) can jump to (0,7) and (4,7)');
    // Elephant eye blocked at (1,8)
    pieces.push({ id: 'blocker', type: 'SOLDIER', color: 'RED', x: 1, y: 8 });
    moves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 2, y: 9 }, 'RED');
    assert_1.default.strictEqual(moves.length, 1, 'Blocked elephant eye at (1,8) allows only (4,7)');
    assert_1.default.deepStrictEqual(moves[0].to, { x: 4, y: 7 });
    // Red elephant at (4,5) cannot cross river to (2,3) or (6,3)
    const riverElephantPieces = [
        { id: 'r-ele', type: 'ELEPHANT', color: 'RED', x: 4, y: 5 },
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    const riverMoves = engine_1.XiangqiEngine.getLegalMoves(riverElephantPieces, { x: 4, y: 5 }, 'RED');
    assert_1.default.ok(riverMoves.every((m) => m.to.y >= 5), 'Red Elephant cannot cross river (y < 5)');
    console.log('✓ Test 4: Elephant movement, eye blocking & river constraint verified');
}
// Test 5: Horse Movement & Hobbling Horse's Leg (Chặn mã)
{
    const pieces = [
        { id: 'r-horse', type: 'HORSE', color: 'RED', x: 4, y: 5 },
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    // In center of board with no obstacles, horse has 8 moves
    let moves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 4, y: 5 }, 'RED');
    assert_1.default.strictEqual(moves.length, 8, 'Unblocked center horse has 8 moves');
    // Block top leg at (4,4)
    pieces.push({ id: 'blocker-top', type: 'SOLDIER', color: 'BLACK', x: 4, y: 4 });
    moves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 4, y: 5 }, 'RED');
    // Blocked top leg removes (3,3) and (5,3) -> 6 moves remaining
    assert_1.default.strictEqual(moves.length, 6, 'Hobbled top leg leaves 6 moves');
    assert_1.default.ok(!moves.some((m) => m.to.y === 3), 'No moves with y=3 when top leg is blocked');
    console.log('✓ Test 5: Horse movement & leg blocking verified');
}
// Test 6: Chariot & Cannon Screen Logic
{
    // Cannon screen test
    const pieces = [
        { id: 'r-can', type: 'CANNON', color: 'RED', x: 1, y: 2 },
        { id: 'screen', type: 'SOLDIER', color: 'RED', x: 4, y: 2 }, // Screen at (4,2)
        { id: 'target-enemy', type: 'HORSE', color: 'BLACK', x: 7, y: 2 }, // Target at (7,2)
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    const cannonMoves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 1, y: 2 }, 'RED');
    // Move without capture: (0,2), (2,2), (3,2). Cannot land on screen (4,2) or beyond without capture.
    // Move with capture: jumps screen (4,2) to capture (7,2). Cannot jump beyond (7,2).
    assert_1.default.ok(cannonMoves.some((m) => m.to.x === 7 && m.to.y === 2), 'Cannon must be able to capture enemy behind screen');
    assert_1.default.ok(!cannonMoves.some((m) => m.to.x === 8 && m.to.y === 2), 'Cannon cannot move past captured target');
    assert_1.default.ok(!cannonMoves.some((m) => m.to.x === 4 && m.to.y === 2), 'Cannon cannot land on screen piece');
    console.log('✓ Test 6: Cannon jumping & screen capture verified');
}
// Test 7: Soldier Movement before and after River
{
    const pieces = [
        { id: 'r-sol-pre', type: 'SOLDIER', color: 'RED', x: 4, y: 6 }, // Before river (y=6)
        { id: 'r-sol-post', type: 'SOLDIER', color: 'RED', x: 4, y: 3 }, // Across river (y=3)
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    const preMoves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 4, y: 6 }, 'RED');
    assert_1.default.strictEqual(preMoves.length, 1, 'Soldier before river can only move forward');
    assert_1.default.deepStrictEqual(preMoves[0].to, { x: 4, y: 5 });
    const postMoves = engine_1.XiangqiEngine.getLegalMoves(pieces, { x: 4, y: 3 }, 'RED');
    assert_1.default.strictEqual(postMoves.length, 3, 'Soldier across river can move forward, left, or right');
    console.log('✓ Test 7: Soldier river crossing movement verified');
}
// Test 8: Check, Checkmate, and Stalemate
{
    // Direct Check
    const checkPieces = [
        { id: 'b-char', type: 'CHARIOT', color: 'BLACK', x: 4, y: 2 },
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
    ];
    assert_1.default.strictEqual((0, check_1.isInCheck)(checkPieces, 'RED'), true, 'Red general must be detected in check by Chariot');
    // Checkmate scenario: Black Chariot at (4,8) delivers check, Black Chariot at (3,8) covers escapes, etc.
    // Simple checkmate: Red General at (4,9). Black Chariots at (4,8) protected by Horse at (2,7), leaving general no escape
    const matePieces = [
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
        { id: 'b-char1', type: 'CHARIOT', color: 'BLACK', x: 4, y: 8 },
        { id: 'b-horse', type: 'HORSE', color: 'BLACK', x: 2, y: 7 }, // Protects Chariot at (4,8)
        { id: 'b-char2', type: 'CHARIOT', color: 'BLACK', x: 3, y: 9 }, // Attacking file 3
        { id: 'b-char3', type: 'CHARIOT', color: 'BLACK', x: 5, y: 9 }, // Attacking file 5
    ];
    const redEscapes = engine_1.XiangqiEngine.getAllLegalMoves(matePieces, 'RED');
    assert_1.default.strictEqual(redEscapes.length, 0, 'No legal moves for Red in checkmate position');
    assert_1.default.strictEqual((0, check_1.isInCheck)(matePieces, 'RED'), true, 'Red is in check');
    // Stalemate scenario: General not in check, but has 0 legal moves
    const stalematePieces = [
        { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 3, y: 9 }, // Corner of palace
        { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 5, y: 0 },
        // Block Red general at (3,9): can go to (3,8) or (4,9)
        // Black Chariot at (2,8) attacks rank 8 (so (3,8) is under attack)
        { id: 'b-char1', type: 'CHARIOT', color: 'BLACK', x: 2, y: 8 },
        // Black Chariot at (4,5) attacks column 4 (so (4,9) is under attack)
        { id: 'b-char2', type: 'CHARIOT', color: 'BLACK', x: 4, y: 5 },
    ];
    // Red general at (3,9) is NOT in check because (3,9) is not under attack!
    assert_1.default.strictEqual((0, check_1.isInCheck)(stalematePieces, 'RED'), false, 'Red general at (3,9) is not in check');
    const stalemateLegalMoves = engine_1.XiangqiEngine.getAllLegalMoves(stalematePieces, 'RED');
    assert_1.default.strictEqual(stalemateLegalMoves.length, 0, 'Red general has 0 legal moves');
    console.log('✓ Test 8: Check, checkmate, and stalemate verified');
}
console.log('--- ALL ENGINE TESTS PASSED SUCCESSFULLY! ---');
