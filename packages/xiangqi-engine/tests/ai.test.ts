import assert from 'assert';
import { XiangqiEngine } from '../src/engine';
import { createInitialPieces } from '../src/constants';
import { Evaluator } from '../src/ai/evaluator';
import { MinimaxAI } from '../src/ai/minimax';
import { getBookMove } from '../src/ai/openingBook';
import { Piece } from '@xiangqi/shared-types';

console.log('--- RUNNING XIANGQI AI ENGINE TESTS ---');

// Test 1: Evaluator initial position
{
  const initialPieces = createInitialPieces();
  const redScore = Evaluator.evaluate(initialPieces, 'RED');
  const blackScore = Evaluator.evaluate(initialPieces, 'BLACK');

  // Both should be symmetric (redScore == -blackScore)
  assert.strictEqual(redScore, -blackScore, 'Initial position evaluation must be zero-sum symmetric');
  assert.strictEqual(redScore, 0, 'Symmetric starting board evaluation must equal 0');
  console.log('✓ Test 1: Board evaluation symmetry and starting balance verified');
}

// Test 2: General missing penalty
{
  const pieces: Piece[] = [
    { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 4, y: 0 },
  ];
  const redScore = Evaluator.evaluate(pieces, 'RED');
  assert.strictEqual(redScore, -100000, 'Red without general must receive loss score');
  console.log('✓ Test 2: Defeat penalty for missing general verified');
}

// Test 3: Opening book lookup
{
  // Red 1st move
  const bookMove = getBookMove([]);
  assert.ok(bookMove, 'Opening book must have starting moves for Red');
  assert.ok(
    ['Trung Pháo', 'Tiên Nhân', 'Khởi Mã', 'Phi Tượng'].some((name) =>
      bookMove.name.includes(name)
    ),
    `Book move should be a classic opening, got: ${bookMove.name}`
  );

  // Black reply to Trung Phao 1,7-4,7
  const blackReply = getBookMove([{ from: { x: 1, y: 7 }, to: { x: 4, y: 7 } }]);
  assert.ok(blackReply, 'Opening book must have counter to Trung Phao');
  console.log('✓ Test 3: Opening book lookups for Red and Black verified:', bookMove.name, '->', blackReply.name);
}

// Test 4: AI picks free piece capture
{
  // Red Cannon at (4,7) can capture Black Chariot at (4,2) with a screen piece at (4,4)
  const tacticalPieces: Piece[] = [
    { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
    { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 4, y: 0 },
    { id: 'r-cannon', type: 'CANNON', color: 'RED', x: 4, y: 7 },
    { id: 'screen', type: 'SOLDIER', color: 'RED', x: 4, y: 4 },
    { id: 'b-chariot', type: 'CHARIOT', color: 'BLACK', x: 4, y: 2 },
  ];

  const aiResult = MinimaxAI.getBestMove(tacticalPieces, 'RED', 'hard');
  assert.strictEqual(aiResult.move.to.x, 4, 'Cannon must capture on file 4');
  assert.strictEqual(aiResult.move.to.y, 2, 'Cannon must capture Black Chariot at (4,2)');
  console.log('✓ Test 4: AI tactical capture (Cannon captures Chariot) verified');
}

// Test 5: Check escape
{
  // Black Chariot at (4,2) checks Red General at (4,9). Red has Chariot at (0,9) that can block or take.
  const checkPieces: Piece[] = [
    { id: 'r-gen', type: 'GENERAL', color: 'RED', x: 4, y: 9 },
    { id: 'b-gen', type: 'GENERAL', color: 'BLACK', x: 3, y: 0 },
    { id: 'b-chariot', type: 'CHARIOT', color: 'BLACK', x: 4, y: 2 },
    { id: 'r-chariot', type: 'CHARIOT', color: 'RED', x: 0, y: 2 }, // Can take chariot at (4,2)
  ];

  const aiResult = MinimaxAI.getBestMove(checkPieces, 'RED', 'medium');
  assert.strictEqual(aiResult.move.to.x, 4, 'Red must eliminate check at (4,2)');
  assert.strictEqual(aiResult.move.to.y, 2, 'Red Chariot takes attacking Black Chariot');
  console.log('✓ Test 5: AI escapes check by capturing attacker verified');
}

// Test 6: Hint generator
{
  const initialPieces = createInitialPieces();
  const hint = MinimaxAI.getHint(initialPieces, 'RED');
  assert.ok(hint.move, 'Hint must return a legal move');
  assert.ok(hint.explanation.length > 5, 'Hint must provide explanation text');
  console.log('✓ Test 6: Hint generator verified:', hint.explanation);
}

// Test 7: Difficulty Levels (1 to 4) on initial board
{
  const initialPieces = createInitialPieces();
  for (const level of [1, 2, 3, 4] as const) {
    const res = MinimaxAI.getBestMove(initialPieces, 'RED', level);
    assert.ok(res.move, `Level ${level} must return valid move`);
    const valid = XiangqiEngine.validateMove(initialPieces, 'RED', res.move.from, res.move.to);
    assert.ok(valid.isValid, `Level ${level} move must be strictly legal`);
  }
  console.log('✓ Test 7: All 4 difficulty levels return legal moves');
}

console.log('--- ALL XIANGQI AI ENGINE TESTS PASSED! ---');
