import { Move, PositionCoordinate } from '@xiangqi/shared-types';

export interface BookEntry {
  from: PositionCoordinate;
  to: PositionCoordinate;
  name: string;
  weight: number;
}

// Convert a move to compact string: "fx,fy-tx,ty"
export function moveToKey(from: PositionCoordinate, to: PositionCoordinate): string {
  return `${from.x},${from.y}-${to.x},${to.y}`;
}

// Path key: joins previous moves by "/"
// e.g. "" for start position, "1,7-4,7" after Red's first move, "1,7-4,7/1,0-2,2" after Black's reply.
export const OPENING_BOOK: Record<string, BookEntry[]> = {
  // START POSITION (RED's 1st move)
  '': [
    // Pháo 2 bình 5 (Trung Pháo - Central Cannon, strongest and most popular)
    { from: { x: 1, y: 7 }, to: { x: 4, y: 7 }, name: 'Trung Pháo (Pháo 2 bình 5)', weight: 45 },
    // Pháo 8 bình 5 (Trung Pháo)
    { from: { x: 7, y: 7 }, to: { x: 4, y: 7 }, name: 'Trung Pháo (Pháo 8 bình 5)', weight: 25 },
    // Tiên Nhân Chỉ Lộ (Binh 7 tiến 1)
    { from: { x: 6, y: 6 }, to: { x: 6, y: 5 }, name: 'Tiên Nhân Chỉ Lộ (Binh 7 tiến 1)', weight: 15 },
    // Khởi Mã Cục (Mã 2 tiến 3)
    { from: { x: 7, y: 9 }, to: { x: 6, y: 7 }, name: 'Khởi Mã Cục (Mã 2 tiến 3)', weight: 10 },
    // Phi Tượng Cục (Tượng 3 tiến 5)
    { from: { x: 2, y: 9 }, to: { x: 4, y: 7 }, name: 'Phi Tượng Cục (Tượng 3 tiến 5)', weight: 5 },
  ],

  // AFTER RED: Pháo 2 bình 5 (1,7 -> 4,7)
  '1,7-4,7': [
    // Bình Phong Mã (Mã 8 tiến 7)
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, name: 'Bình Phong Mã (Mã 8 tiến 7)', weight: 45 },
    // Thuận Pháo (Pháo 8 bình 5)
    { from: { x: 1, y: 2 }, to: { x: 4, y: 2 }, name: 'Thuận Pháo (Pháo 8 bình 5)', weight: 30 },
    // Nghịch Pháo (Pháo 2 bình 5)
    { from: { x: 7, y: 2 }, to: { x: 4, y: 2 }, name: 'Nghịch Pháo (Pháo 2 bình 5)', weight: 15 },
    // Đơn Đề Mã (Mã 2 tiến 3)
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, name: 'Đơn Đề Mã (Mã 2 tiến 3)', weight: 10 },
  ],

  // AFTER RED: Pháo 8 bình 5 (7,7 -> 4,7)
  '7,7-4,7': [
    // Bình Phong Mã (Mã 2 tiến 3)
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, name: 'Bình Phong Mã (Mã 2 tiến 3)', weight: 45 },
    // Thuận Pháo (Pháo 2 bình 5)
    { from: { x: 7, y: 2 }, to: { x: 4, y: 2 }, name: 'Thuận Pháo (Pháo 2 bình 5)', weight: 30 },
    // Nghịch Pháo (Pháo 8 bình 5)
    { from: { x: 1, y: 2 }, to: { x: 4, y: 2 }, name: 'Nghịch Pháo (Pháo 8 bình 5)', weight: 15 },
    // Mã 8 tiến 7
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, name: 'Bình Phong Mã (Mã 8 tiến 7)', weight: 10 },
  ],

  // AFTER RED: Tiên Nhân Chỉ Lộ (6,6 -> 6,5)
  '6,6-6,5': [
    // Đối Binh Cục (Tốt 7 tiến 1)
    { from: { x: 6, y: 3 }, to: { x: 6, y: 4 }, name: 'Đối Binh Cục (Tốt 7 tiến 1)', weight: 40 },
    // Tốt Để Pháo (Pháo 8 bình 7)
    { from: { x: 1, y: 2 }, to: { x: 2, y: 2 }, name: 'Tốt Để Pháo (Pháo 8 bình 7)', weight: 35 },
    // Kim Câu Pháo (Pháo 2 bình 7)
    { from: { x: 7, y: 2 }, to: { x: 6, y: 2 }, name: 'Kim Câu Pháo (Pháo 2 bình 7)', weight: 25 },
  ],

  // AFTER RED: Khởi Mã (7,9 -> 6,7)
  '7,9-6,7': [
    // Tốt 7 tiến 1
    { from: { x: 6, y: 3 }, to: { x: 6, y: 4 }, name: 'Tốt 7 tiến 1', weight: 40 },
    // Pháo 8 bình 5
    { from: { x: 1, y: 2 }, to: { x: 4, y: 2 }, name: 'Trung Pháo Phản Công', weight: 40 },
    // Mã 8 tiến 7
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, name: 'Mã 8 tiến 7', weight: 20 },
  ],

  // LINE: Trung Pháo vs Bình Phong Mã: 1,7-4,7 / 1,0-2,2
  '1,7-4,7/1,0-2,2': [
    // Red: Mã 2 tiến 3 (7,9 -> 6,7)
    { from: { x: 7, y: 9 }, to: { x: 6, y: 7 }, name: 'Mã 2 tiến 3', weight: 70 },
    // Red: Binh 7 tiến 1 (6,6 -> 6,5)
    { from: { x: 6, y: 6 }, to: { x: 6, y: 5 }, name: 'Binh 7 tiến 1', weight: 30 },
  ],

  // LINE: 1,7-4,7 / 1,0-2,2 / 7,9-6,7 (Red Mã 2 tiến 3)
  '1,7-4,7/1,0-2,2/7,9-6,7': [
    // Black: Xe 9 tiến 1 (hoặc Xe 9 bình 8: 0,0 -> 1,0)
    { from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, name: 'Xe 9 bình 8', weight: 50 },
    // Black: Mã 2 tiến 3 (7,0 -> 6,2) (Bình Phong Mã hoàn chỉnh)
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, name: 'Mã 2 tiến 3 (Song Mã)', weight: 50 },
  ],

  // LINE: 1,7-4,7 / 1,0-2,2 / 7,9-6,7 / 0,0-1,0
  '1,7-4,7/1,0-2,2/7,9-6,7/0,0-1,0': [
    // Red: Xe 1 bình 2 (8,9 -> 7,9)
    { from: { x: 8, y: 9 }, to: { x: 7, y: 9 }, name: 'Xe 1 bình 2 (Trực Xe)', weight: 60 },
    // Red: Binh 7 tiến 1 (6,6 -> 6,5)
    { from: { x: 6, y: 6 }, to: { x: 6, y: 5 }, name: 'Binh 7 tiến 1', weight: 40 },
  ],

  // LINE: Thuận Pháo: 1,7-4,7 / 1,2-4,2
  '1,7-4,7/1,2-4,2': [
    // Red: Mã 2 tiến 3 (7,9 -> 6,7)
    { from: { x: 7, y: 9 }, to: { x: 6, y: 7 }, name: 'Mã 2 tiến 3', weight: 60 },
    // Red: Mã 8 tiến 7 (1,9 -> 2,7)
    { from: { x: 1, y: 9 }, to: { x: 2, y: 7 }, name: 'Mã 8 tiến 7', weight: 40 },
  ],

  // LINE: 1,7-4,7 / 1,2-4,2 / 7,9-6,7
  '1,7-4,7/1,2-4,2/7,9-6,7': [
    // Black: Mã 8 tiến 7 (1,0 -> 2,2)
    { from: { x: 1, y: 0 }, to: { x: 2, y: 2 }, name: 'Mã 8 tiến 7', weight: 60 },
    // Black: Mã 2 tiến 3 (7,0 -> 6,2)
    { from: { x: 7, y: 0 }, to: { x: 6, y: 2 }, name: 'Mã 2 tiến 3', weight: 40 },
  ],
};

/**
 * Searches the opening book for a known response given the sequence of moves made so far.
 * Returns a book move or null if out of book.
 */
export function getBookMove(moveHistory: Move[]): BookEntry | null {
  const path = moveHistory.map((m) => moveToKey(m.from, m.to)).join('/');
  const entries = OPENING_BOOK[path];

  if (!entries || entries.length === 0) {
    return null;
  }

  // Weighted random pick among candidates
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const entry of entries) {
    if (randomVal < entry.weight) {
      return entry;
    }
    randomVal -= entry.weight;
  }

  return entries[0];
}
