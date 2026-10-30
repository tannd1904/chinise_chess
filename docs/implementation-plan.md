# Xiangqi Online — Implementation Plan & Progress Tracking

## Progress Status Overview

| Phase | Milestone | Status | Notes |
|---|---|---|---|
| Phase 0 | Repository Analysis & Architectural Design | **Completed** | Monorepo layout, specifications, rules, protocols drafted |
| Phase 1.1 | Xiangqi Game Engine (`packages/xiangqi-engine`) | **In Progress** | Board, 7 piece types, obstacles, check/checkmate, tests |
| Phase 1.2 | Shared Contracts (`packages/shared-types`) | **Queued** | Coords, Move, Piece, Room, Game, Socket event typings |
| Phase 1.3 | Server MVP (`apps/server`) | **Queued** | Express, Socket.IO, authoritative clock, room manager |
| Phase 1.4 | Web Client MVP (`apps/web`) | **Queued** | React, Tailwind, SVG 90-point board, move hints, timers |
| Phase 1.5 | End-to-End Verification & Stabilization | **Queued** | Dual-browser play, checkmate, resign, timeout, reconnect |
| Phase 2 | User Accounts & Database Persistence | **Future** | PostgreSQL, Prisma, Auth, Match History, Replay |
| Phase 3 | ELO Matchmaking & Real-time Chat | **Future** | Redis queue, ELO rating formula, Leaderboard, Chat |

---

## Technical Decisions & Assumptions

1. **Coordinate System**:
   - $x \in [0, 8]$ (left-to-right columns).
   - $y \in [0, 9]$ (top-to-bottom rows).
   - Black army starts on $y = 0..3$; Red army starts on $y = 6..9$.
   - Red plays first.
2. **Stalemate Outcome**:
   - In accordance with orthodox Chinese Chess rules, a player with zero legal moves on their turn **loses immediately**.
3. **Session Management for Guests**:
   - Each player in a room receives a cryptographically generated `playerToken`.
   - The token is passed in Socket.IO payloads and stored in `sessionStorage` to allow seamless reconnection if the tab reloads or network drops.
4. **Authoritative Clock**:
   - The server maintains the true clock bank and deducts elapsed wall-clock milliseconds upon each move.
   - Periodic synchronization ticks ensure zero drift between client and server.

