import { Piece, PlayerColor } from '@xiangqi/shared-types';
import { isInCheck } from '../check';
import {
  PIECE_MATERIAL_VALUES,
  SOLDIER_CROSSED_RIVER_BONUS,
  SOLDIER_IN_PALACE_BONUS,
  getPiecePSTValue,
} from './constants';

export class Evaluator {
  /**
   * Static board evaluation.
   * Returns a positive score if the board favors `perspective`, negative if it favors the opponent.
   */
  public static evaluate(pieces: Piece[], perspective: PlayerColor): number {
    let redScore = 0;
    let blackScore = 0;

    let redHasGeneral = false;
    let blackHasGeneral = false;

    let redAdvisors = 0;
    let blackAdvisors = 0;
    let redElephants = 0;
    let blackElephants = 0;

    for (const p of pieces) {
      const baseValue = PIECE_MATERIAL_VALUES[p.type] || 0;
      const pstValue = getPiecePSTValue(p.type, p.color, p.x, p.y);
      let pieceTotal = baseValue + pstValue;

      if (p.type === 'GENERAL') {
        if (p.color === 'RED') redHasGeneral = true;
        else blackHasGeneral = true;
      } else if (p.type === 'ADVISOR') {
        if (p.color === 'RED') redAdvisors++;
        else blackAdvisors++;
      } else if (p.type === 'ELEPHANT') {
        if (p.color === 'RED') redElephants++;
        else blackElephants++;
      } else if (p.type === 'SOLDIER') {
        // Red soldier crosses river when y <= 4
        // Black soldier crosses river when y >= 5
        const crossedRiver = (p.color === 'RED' && p.y <= 4) || (p.color === 'BLACK' && p.y >= 5);
        if (crossedRiver) {
          pieceTotal += SOLDIER_CROSSED_RIVER_BONUS;
          // In enemy palace
          const inPalace =
            p.x >= 3 &&
            p.x <= 5 &&
            ((p.color === 'RED' && p.y <= 2) || (p.color === 'BLACK' && p.y >= 7));
          if (inPalace) {
            pieceTotal += SOLDIER_IN_PALACE_BONUS;
          }
        }
      }

      if (p.color === 'RED') {
        redScore += pieceTotal;
      } else {
        blackScore += pieceTotal;
      }
    }

    // Missing General means lost
    if (!redHasGeneral) return perspective === 'RED' ? -100000 : 100000;
    if (!blackHasGeneral) return perspective === 'BLACK' ? -100000 : 100000;

    // Defense structure evaluation (Sĩ Tượng toàn vẹn giúp bảo vệ Tướng)
    redScore += (redAdvisors * 20) + (redElephants * 20);
    blackScore += (blackAdvisors * 20) + (blackElephants * 20);

    // Check pressure
    if (isInCheck(pieces, 'BLACK')) {
      redScore += 45; // Red has active check
    }
    if (isInCheck(pieces, 'RED')) {
      blackScore += 45; // Black has active check
    }

    const netScore = redScore - blackScore;
    return perspective === 'RED' ? netScore : -netScore;
  }
}
