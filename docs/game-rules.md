# Xiangqi (Chinese Chess) — Rules Specification

## 1. Board & Coordinate System

- The board is composed of a grid with 9 vertical lines (files) and 10 horizontal lines (ranks), yielding **90 intersections** (points).
- Pieces rest on intersections, never inside squares.
- Coordinate representation:
  - `x`: 0 to 8 (from left to right, File 1 to File 9 for Red; File 9 to File 1 for Black).
  - `y`: 0 to 9 (from top to bottom).
  - Black starts on ranks `y = 0..3`.
  - Red starts on ranks `y = 6..9`.
- **The River (楚河 - 漢界)**: Lies between rank `y = 4` and rank `y = 5`.
- **Palaces (Cung Tướng)**:
  - Black Palace: `x ∈ [3, 5]`, `y ∈ [0, 2]`.
  - Red Palace: `x ∈ [3, 5]`, `y ∈ [7, 9]`.
  - Includes diagonal crossing lines between corners and the center.

## 2. Piece Rules & Obstacles

Initial army per player:
- 1 General / King (Tướng / Soái)
- 2 Advisors (Sĩ)
- 2 Elephants / Ministers (Tượng / Tịnh)
- 2 Horses (Mã)
- 2 Chariots / Rooks (Xe)
- 2 Cannons (Pháo)
- 5 Soldiers / Pawns (Tốt / Binh)

### 2.1. General (帥 Shuai / 將 Jiang)
- Moves 1 step orthogonally (horizontal or vertical).
- Must stay strictly within the 3x3 Palace.
- **Flying General Rule (Lộ mặt tướng)**: The two generals may not face each other on the same vertical file with no intervening pieces. Any move leaving generals facing each other is illegal.

### 2.2. Advisor (仕 Shi / 士 Shi)
- Moves 1 step diagonally.
- Must stay strictly within the Palace (restricted to 5 specific intersections: corners and center).

### 2.3. Elephant (相 Xiang / 象 Xiang)
- Moves exactly 2 steps diagonally (forming a 2x2 diagonal jump).
- **River constraint**: Cannot cross the river (Red restricted to `y >= 5`, Black to `y <= 4`).
- **Obstacle rule (Elephant's eye - Mắt tượng)**: If the intermediate diagonal point (1 step diagonally in the direction of movement) is occupied by any piece, the elephant is blocked and cannot make the move.

### 2.4. Horse (傌 Ma / 馬 Ma)
- Moves in an "L" shape: 1 step orthogonally followed by 1 step diagonally outward.
- **Obstacle rule (Hobbling the horse's leg - Chặn mã)**: If the adjacent orthogonal intersection in the direction of the initial step is occupied by any piece, the horse is hobbled and cannot move in either of the two diagonal directions branching from that leg.

### 2.5. Chariot (俥 Ju / 車 Ju)
- Moves any number of unoccupied points orthogonally (straight along rows or files).
- Cannot jump over any piece. Captures the first enemy piece in its orthogonal path.

### 2.6. Cannon (炮 Pao / 砲 Pao)
- Non-capturing move: identical to the Chariot (orthogonal straight line, cannot jump).
- Capturing move: Must jump over **exactly one intervening piece** of either side (the screen or "ngòi") to capture an enemy piece. Cannot jump over two or more pieces, and cannot capture without a screen.

### 2.7. Soldier (兵 Bing / 卒 Zu)
- Before crossing the river: Moves and captures only 1 step forward.
- After crossing the river: Moves and captures 1 step forward OR 1 step horizontally (left/right).
- Never moves backward. Does not promote like western pawns.

## 3. Game State & Victory Conditions

1. **Check (Chiếu)**: A player's General is directly under attack by one or more enemy pieces.
2. **Checkmate (Chiếu bí)**: The player in check has no legal moves to eliminate the check (by moving the general, capturing the attacker, or interposing a piece). The checked player loses.
3. **Stalemate (Hết nước đi)**: A player whose turn it is has no legal moves, even if not currently in check. In Xiangqi rules, the player with no legal moves **loses the game** (unlike Western chess where it is a draw).
4. **Resignation (Đầu hàng)**: A player concedes defeat; opponent wins.
5. **Timeout (Hết giờ)**: A player's time bank reaches 0; opponent wins.
6. **Agreed Draw (Hòa theo thỏa thuận)**: One player offers a draw and the opponent accepts.
7. **Perpetual Check / Move Repetition**: In standard competitive Xiangqi, perpetual checking is forbidden and the checking player must change their move. For MVP, if three-fold repetition occurs without perpetual checking, players may offer draw or referee resolution rules apply.

