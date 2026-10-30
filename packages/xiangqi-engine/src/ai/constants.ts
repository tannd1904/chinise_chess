import { PieceType, PlayerColor, PositionCoordinate } from '@xiangqi/shared-types';

export const PIECE_MATERIAL_VALUES: Record<PieceType, number> = {
  GENERAL: 100000,
  CHARIOT: 900,
  CANNON: 450,
  HORSE: 400,
  ELEPHANT: 200,
  ADVISOR: 200,
  SOLDIER: 100, // River-crossed soldier gets extra in evaluator
};

export const SOLDIER_CROSSED_RIVER_BONUS = 120;
export const SOLDIER_IN_PALACE_BONUS = 80;

// 9 columns (0..8) x 10 rows (0..9)
// Values defined from RED's perspective (Red starts at y=9, advances towards y=0).
// For Black, mirror row: blackY = 9 - y.

export const CHARIOT_PST: number[][] = [
  // y = 0 (Black baseline)
  [10, 20, 20, 25, 25, 25, 20, 20, 10],
  // y = 1 (Black palace)
  [15, 25, 30, 35, 35, 35, 30, 25, 15],
  // y = 2 (Black cannon line)
  [10, 20, 20, 25, 25, 25, 20, 20, 10],
  // y = 3 (Black soldier line)
  [10, 15, 15, 20, 20, 20, 15, 15, 10],
  // y = 4 (Black riverbank)
  [10, 15, 15, 20, 20, 20, 15, 15, 10],
  // y = 5 (Red riverbank)
  [5, 10, 10, 15, 15, 15, 10, 10, 5],
  // y = 6 (Red soldier line)
  [5, 10, 10, 15, 15, 15, 10, 10, 5],
  // y = 7 (Red cannon line)
  [0, 5, 5, 10, 10, 10, 5, 5, 0],
  // y = 8
  [0, 5, 5, 10, 10, 10, 5, 5, 0],
  // y = 9 (Red baseline)
  [0, 0, 5, 5, 5, 5, 5, 0, 0],
];

export const HORSE_PST: number[][] = [
  // y = 0
  [0, 5, 10, 10, 10, 10, 10, 5, 0],
  // y = 1
  [5, 15, 20, 25, 25, 25, 20, 15, 5],
  // y = 2
  [5, 20, 25, 30, 30, 30, 25, 20, 5],
  // y = 3
  [5, 15, 20, 25, 25, 25, 20, 15, 5],
  // y = 4
  [5, 15, 20, 20, 20, 20, 20, 15, 5],
  // y = 5
  [0, 10, 15, 15, 15, 15, 15, 10, 0],
  // y = 6
  [0, 10, 15, 20, 15, 20, 15, 10, 0],
  // y = 7
  [0, 5, 10, 10, 10, 10, 10, 5, 0],
  // y = 8
  [0, 0, 5, 5, 5, 5, 5, 0, 0],
  // y = 9
  [-5, 0, 0, 0, 0, 0, 0, 0, -5],
];

export const CANNON_PST: number[][] = [
  // y = 0
  [0, 5, 10, 15, 15, 15, 10, 5, 0],
  // y = 1
  [5, 10, 15, 20, 20, 20, 15, 10, 5],
  // y = 2 (Threatening enemy palace)
  [5, 15, 20, 25, 30, 25, 20, 15, 5],
  // y = 3
  [0, 5, 10, 15, 20, 15, 10, 5, 0],
  // y = 4
  [0, 5, 5, 10, 15, 10, 5, 5, 0],
  // y = 5
  [0, 5, 5, 10, 15, 10, 5, 5, 0],
  // y = 6
  [0, 0, 5, 10, 15, 10, 5, 0, 0],
  // y = 7 (Home battery)
  [0, 5, 5, 10, 25, 10, 5, 5, 0],
  // y = 8
  [0, 0, 0, 5, 10, 5, 0, 0, 0],
  // y = 9
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export const SOLDIER_PST: number[][] = [
  // y = 0 (Deep in enemy palace)
  [0, 20, 30, 40, 50, 40, 30, 20, 0],
  // y = 1
  [15, 25, 35, 45, 50, 45, 35, 25, 15],
  // y = 2
  [10, 20, 30, 40, 45, 40, 30, 20, 10],
  // y = 3
  [10, 15, 20, 30, 35, 30, 20, 15, 10],
  // y = 4 (Just crossed river)
  [10, 15, 20, 25, 25, 25, 20, 15, 10],
  // y = 5 (Red side riverbank)
  [0, 0, 5, 10, 10, 10, 5, 0, 0],
  // y = 6 (Home soldier line)
  [0, 0, 0, 5, 5, 5, 0, 0, 0],
  // y = 7
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  // y = 8
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  // y = 9
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export function getPiecePSTValue(
  type: PieceType,
  color: PlayerColor,
  x: number,
  y: number
): number {
  const row = color === 'RED' ? y : 9 - y;
  const col = x;

  if (row < 0 || row > 9 || col < 0 || col > 8) return 0;

  switch (type) {
    case 'CHARIOT':
      return CHARIOT_PST[row][col];
    case 'HORSE':
      return HORSE_PST[row][col];
    case 'CANNON':
      return CANNON_PST[row][col];
    case 'SOLDIER':
      return SOLDIER_PST[row][col];
    case 'ADVISOR':
      // Advisors stay in palace: slight reward for center y=8 (for Red)
      return (color === 'RED' && x === 4 && y === 8) || (color === 'BLACK' && x === 4 && y === 1)
        ? 15
        : 10;
    case 'ELEPHANT':
      // Elephants reward being at central defend positions
      return (x === 4 && (y === 7 || y === 2)) ? 15 : 10;
    case 'GENERAL':
      return 0;
    default:
      return 0;
  }
}
