import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Move,
  Piece,
  PlayerColor,
  PositionCoordinate,
} from '@xiangqi/shared-types';
import { PIECE_CHARACTERS } from './pieceCharacters';

interface XiangqiBoardProps {
  pieces: Piece[];
  currentTurn: PlayerColor;
  playerColor?: PlayerColor; // The perspective of the current user
  isFlipped?: boolean; // If true, Black is on bottom
  selectedCoord: PositionCoordinate | null;
  legalTargets: PositionCoordinate[];
  lastMove: Move | null;
  isInCheck?: boolean;
  checkedColor?: PlayerColor | null;
  onIntersectionClick: (coord: PositionCoordinate) => void;
  disabled?: boolean;
}

export const XiangqiBoard: React.FC<XiangqiBoardProps> = ({
  pieces,
  isFlipped = false,
  selectedCoord,
  legalTargets,
  lastMove,
  isInCheck = false,
  checkedColor = null,
  onIntersectionClick,
  disabled = false,
}) => {
  // SVG Grid Metrics
  const MARGIN_X = 40;
  const MARGIN_Y = 40;
  const CELL_SIZE = 65;
  const WIDTH = MARGIN_X * 2 + 8 * CELL_SIZE; // 600
  const HEIGHT = MARGIN_Y * 2 + 9 * CELL_SIZE; // 665
  const PIECE_RADIUS = 26;

  // Track the piece currently animating from a move
  const [animatingPieceId, setAnimatingPieceId] = useState<string | null>(null);
  const [fadingCapturedPiece, setFadingCapturedPiece] = useState<{
    piece: Piece;
    x: number;
    y: number;
  } | null>(null);

  // Prevent cross-flying animation when the board is merely flipped
  const prevFlippedRef = useRef<boolean>(isFlipped);
  const [skipTransition, setSkipTransition] = useState<boolean>(false);

  useEffect(() => {
    if (prevFlippedRef.current !== isFlipped) {
      prevFlippedRef.current = isFlipped;
      setSkipTransition(true);
      const timer = setTimeout(() => setSkipTransition(false), 50);
      return () => clearTimeout(timer);
    }
  }, [isFlipped]);

  // Trigger piece lifting & sliding animation on move
  const lastMoveRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastMove) return;

    const moveKey = `${lastMove.from.x},${lastMove.from.y}->${lastMove.to.x},${lastMove.to.y}`;
    if (lastMoveRef.current !== moveKey) {
      lastMoveRef.current = moveKey;

      // Find the piece that just landed at lastMove.to
      const movedPiece = pieces.find(
        (p) => p.x === lastMove.to.x && p.y === lastMove.to.y
      );

      if (movedPiece) {
        setAnimatingPieceId(movedPiece.id);

        // Captured piece handling: dissolve gently over 800ms
        if (lastMove.capturedPiece) {
          setFadingCapturedPiece({
            piece: lastMove.capturedPiece,
            x: lastMove.to.x,
            y: lastMove.to.y,
          });
        }

        // Lift & gliding duration: 850ms (calm, slow, human-like motion)
        const timer = setTimeout(() => {
          setAnimatingPieceId(null);
          setFadingCapturedPiece(null);
        }, 850);

        return () => clearTimeout(timer);
      }
    }
  }, [lastMove, pieces]);

  // Convert logical coordinates (x: 0..8, y: 0..9) to SVG pixel coordinates
  const toSvgCoords = (x: number, y: number) => {
    const finalX = isFlipped ? 8 - x : x;
    const finalY = isFlipped ? 9 - y : y;
    return {
      cx: MARGIN_X + finalX * CELL_SIZE,
      cy: MARGIN_Y + finalY * CELL_SIZE,
    };
  };

  const handlePointClick = (x: number, y: number) => {
    if (disabled) return;
    onIntersectionClick({ x, y });
  };

  // Quick lookup map for pieces by coordinate
  const pieceMap = useMemo(() => {
    const map = new Map<string, Piece>();
    for (const piece of pieces) {
      map.set(`${piece.x},${piece.y}`, piece);
    }
    return map;
  }, [pieces]);

  // Target coordinates set for O(1) membership check
  const legalTargetSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of legalTargets) {
      set.add(`${t.x},${t.y}`);
    }
    return set;
  }, [legalTargets]);

  // Sort pieces so that the lifted piece (selected or moving) is drawn last in the SVG
  // so it hovers ABOVE all other pieces without getting occluded
  const sortedPieces = useMemo(() => {
    return [...pieces].sort((a, b) => {
      const aLifted =
        a.id === animatingPieceId ||
        (selectedCoord && a.x === selectedCoord.x && a.y === selectedCoord.y);
      const bLifted =
        b.id === animatingPieceId ||
        (selectedCoord && b.x === selectedCoord.x && b.y === selectedCoord.y);
      if (aLifted && !bLifted) return 1;
      if (!aLifted && bLifted) return -1;
      return 0;
    });
  }, [pieces, animatingPieceId, selectedCoord]);

  return (
    <div className="relative flex justify-center items-center w-full max-w-[620px] mx-auto select-none">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto max-h-[82vh] rounded-2xl shadow-2xl border-4 border-[#3e2714] bg-[#ebd5b3] transition-all duration-300"
      >
        <defs>
          {/* Subtle Wood Texture Gradient */}
          <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3e0c0" />
            <stop offset="50%" stopColor="#e8cfab" />
            <stop offset="100%" stopColor="#dfc39a" />
          </linearGradient>

          {/* Red Piece Gradient */}
          <radialGradient id="redPieceGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fffafa" />
            <stop offset="40%" stopColor="#fed7d7" />
            <stop offset="90%" stopColor="#e28b8b" />
            <stop offset="100%" stopColor="#9b2c2c" />
          </radialGradient>

          {/* Black Piece Gradient */}
          <radialGradient id="blackPieceGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#f7fafc" />
            <stop offset="45%" stopColor="#e2e8f0" />
            <stop offset="90%" stopColor="#a0aec0" />
            <stop offset="100%" stopColor="#2d3748" />
          </radialGradient>

          {/* Normal Shadow for Pieces on Board */}
          <filter id="pieceNormalShadow" x="-25%" y="-25%" width="160%" height="160%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#1a0f07" floodOpacity="0.45" />
          </filter>

          {/* Deeper, Softer Shadow for Lifted Moving/Selected Piece */}
          <filter id="pieceLiftedShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="4" dy="12" stdDeviation="8" floodColor="#1a0f07" floodOpacity="0.65" />
          </filter>

          {/* Highlight Aura for Check */}
          <filter id="checkGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Glowing Aura for Destination Square */}
          <filter id="lastMoveAura" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Directional Trajectory Arrowhead Marker */}
          <marker
            id="moveArrowHead"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* Board Background */}
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#boardBg)" rx="16" />

        {/* Outer and Inner Border Lines */}
        <rect
          x={MARGIN_X - 12}
          y={MARGIN_Y - 12}
          width={8 * CELL_SIZE + 24}
          height={9 * CELL_SIZE + 24}
          fill="none"
          stroke="#4a2e16"
          strokeWidth="3.5"
          rx="6"
        />

        {/* Horizontal Grid Lines (10 ranks) */}
        {Array.from({ length: 10 }).map((_, rank) => {
          const pLeft = toSvgCoords(0, rank);
          const pRight = toSvgCoords(8, rank);
          return (
            <line
              key={`h-line-${rank}`}
              x1={pLeft.cx}
              y1={pLeft.cy}
              x2={pRight.cx}
              y2={pRight.cy}
              stroke="#5a381b"
              strokeWidth="1.6"
            />
          );
        })}

        {/* Vertical Grid Lines (9 files) - Interrupted at River for inner 7 files */}
        {Array.from({ length: 9 }).map((_, file) => {
          if (file === 0 || file === 8) {
            const pTop = toSvgCoords(file, 0);
            const pBottom = toSvgCoords(file, 9);
            return (
              <line
                key={`v-edge-${file}`}
                x1={pTop.cx}
                y1={pTop.cy}
                x2={pBottom.cx}
                y2={pBottom.cy}
                stroke="#5a381b"
                strokeWidth="1.6"
              />
            );
          } else {
            const pTop0 = toSvgCoords(file, 0);
            const pTop4 = toSvgCoords(file, 4);
            const pBot5 = toSvgCoords(file, 5);
            const pBot9 = toSvgCoords(file, 9);
            return (
              <g key={`v-split-${file}`}>
                <line
                  x1={pTop0.cx}
                  y1={pTop0.cy}
                  x2={pTop4.cx}
                  y2={pTop4.cy}
                  stroke="#5a381b"
                  strokeWidth="1.6"
                />
                <line
                  x1={pBot5.cx}
                  y1={pBot5.cy}
                  x2={pBot9.cx}
                  y2={pBot9.cy}
                  stroke="#5a381b"
                  strokeWidth="1.6"
                />
              </g>
            );
          }
        })}

        {/* Palaces Diagonal Cross Lines */}
        {/* Black Palace: (3,0)-(5,2) and (5,0)-(3,2) */}
        <line
          x1={toSvgCoords(3, 0).cx}
          y1={toSvgCoords(3, 0).cy}
          x2={toSvgCoords(5, 2).cx}
          y2={toSvgCoords(5, 2).cy}
          stroke="#5a381b"
          strokeWidth="1.4"
        />
        <line
          x1={toSvgCoords(5, 0).cx}
          y1={toSvgCoords(5, 0).cy}
          x2={toSvgCoords(3, 2).cx}
          y2={toSvgCoords(3, 2).cy}
          stroke="#5a381b"
          strokeWidth="1.4"
        />

        {/* Red Palace: (3,7)-(5,9) and (5,7)-(3,9) */}
        <line
          x1={toSvgCoords(3, 7).cx}
          y1={toSvgCoords(3, 7).cy}
          x2={toSvgCoords(5, 9).cx}
          y2={toSvgCoords(5, 9).cy}
          stroke="#5a381b"
          strokeWidth="1.4"
        />
        <line
          x1={toSvgCoords(5, 7).cx}
          y1={toSvgCoords(5, 7).cy}
          x2={toSvgCoords(3, 9).cx}
          y2={toSvgCoords(3, 9).cy}
          stroke="#5a381b"
          strokeWidth="1.4"
        />

        {/* The River Text (Sở Hà - Hán Giới / 楚河 - 漢界) */}
        {(() => {
          const yCenter = (toSvgCoords(0, 4).cy + toSvgCoords(0, 5).cy) / 2;
          const leftTextX = MARGIN_X + 2 * CELL_SIZE;
          const rightTextX = MARGIN_X + 6 * CELL_SIZE;
          return (
            <g className="font-calligraphy select-none opacity-45 pointer-events-none" fill="#4a2e16">
              <text
                x={leftTextX}
                y={yCenter + 8}
                textAnchor="middle"
                fontSize="24"
                fontWeight="900"
                letterSpacing="12"
              >
                楚河
              </text>
              <text
                x={rightTextX}
                y={yCenter + 8}
                textAnchor="middle"
                fontSize="24"
                fontWeight="900"
                letterSpacing="12"
              >
                漢界
              </text>
            </g>
          );
        })()}

        {/* ========================================================= */}
        {/* SUPER CLEAR LAST-MOVE VISUALS: Origin, Trajectory Arrow, & Destination */}
        {/* ========================================================= */}
        {lastMove && (() => {
          const pFrom = toSvgCoords(lastMove.from.x, lastMove.from.y);
          const pTo = toSvgCoords(lastMove.to.x, lastMove.to.y);

          // Calculate directional arrow offsets
          const dx = pTo.cx - pFrom.cx;
          const dy = pTo.cy - pFrom.cy;
          const dist = Math.hypot(dx, dy);

          const startOffset = 14;
          const endOffset = PIECE_RADIUS + 6;

          const startX = dist > 0 ? pFrom.cx + (dx / dist) * startOffset : pFrom.cx;
          const startY = dist > 0 ? pFrom.cy + (dy / dist) * startOffset : pFrom.cy;
          const endX = dist > 0 ? pTo.cx - (dx / dist) * endOffset : pTo.cx;
          const endY = dist > 0 ? pTo.cy - (dy / dist) * endOffset : pTo.cy;

          return (
            <g className="pointer-events-none transition-all duration-500">
              {/* 1. Origin Square Highlight */}
              <circle
                cx={pFrom.cx}
                cy={pFrom.cy}
                r={PIECE_RADIUS + 3}
                fill="rgba(245, 158, 11, 0.2)"
                stroke="#d97706"
                strokeWidth="2.5"
                strokeDasharray="6 3"
                className="animate-pulse"
              />
              <circle cx={pFrom.cx} cy={pFrom.cy} r={4.5} fill="#f59e0b" opacity={0.8} />

              {/* 2. Trajectory Directional Arrow */}
              {dist > 10 && (
                <>
                  {/* Subtle dark backdrop line for high contrast */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="rgba(0, 0, 0, 0.35)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  {/* Glowing golden arrow line */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="#f59e0b"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeDasharray="7 4"
                    markerEnd="url(#moveArrowHead)"
                  />
                </>
              )}

              {/* 3. Destination Square Aura */}
              <circle
                cx={pTo.cx}
                cy={pTo.cy}
                r={PIECE_RADIUS + 4}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                filter="url(#lastMoveAura)"
              />
            </g>
          );
        })()}

        {/* King in Check Alert Ring */}
        {isInCheck && checkedColor && (() => {
          const checkedGeneral = pieces.find(
            (p) => p.type === 'GENERAL' && p.color === checkedColor
          );
          if (!checkedGeneral) return null;
          const pt = toSvgCoords(checkedGeneral.x, checkedGeneral.y);
          return (
            <circle
              cx={pt.cx}
              cy={pt.cy}
              r={PIECE_RADIUS + 8}
              fill="rgba(220, 38, 38, 0.3)"
              stroke="#dc2626"
              strokeWidth="4"
              className="animate-ping"
            />
          );
        })()}

        {/* Selected Piece Highlight Ring */}
        {selectedCoord && (() => {
          const pt = toSvgCoords(selectedCoord.x, selectedCoord.y);
          return (
            <circle
              cx={pt.cx}
              cy={pt.cy}
              r={PIECE_RADIUS + 5}
              fill="rgba(245, 158, 11, 0.25)"
              stroke="#f59e0b"
              strokeWidth="3.5"
              className="animate-pulse"
            />
          );
        })()}

        {/* Captured Piece Fade-out / Dissolve Indicator */}
        {fadingCapturedPiece && (() => {
          const pt = toSvgCoords(fadingCapturedPiece.x, fadingCapturedPiece.y);
          const isRed = fadingCapturedPiece.piece.color === 'RED';
          const char = PIECE_CHARACTERS[fadingCapturedPiece.piece.color][fadingCapturedPiece.piece.type];
          return (
            <g
              className="pointer-events-none transition-all duration-700 ease-out"
              style={{
                transform: `translate3d(${pt.cx}px, ${pt.cy}px, 0) scale(0.85)`,
                opacity: 0,
              }}
            >
              <circle
                cx={0}
                cy={0}
                r={PIECE_RADIUS}
                fill={isRed ? 'url(#redPieceGrad)' : 'url(#blackPieceGrad)'}
                stroke={isRed ? '#9b2c2c' : '#1a202c'}
                strokeWidth="2"
                opacity={0.6}
              />
              <text
                x={0}
                y={8}
                textAnchor="middle"
                fontSize="24"
                fontWeight="900"
                fill={isRed ? '#b91c1c' : '#111827'}
                opacity={0.6}
              >
                {char}
              </text>
            </g>
          );
        })()}

        {/* ========================================================= */}
        {/* RENDER 32 PIECES WITH DIGNIFIED, SLOW HUMAN-LIKE SLIDE ANIMATION */}
        {/* ========================================================= */}
        {sortedPieces.map((piece) => {
          const { cx, cy } = toSvgCoords(piece.x, piece.y);
          const isRed = piece.color === 'RED';
          const char = PIECE_CHARACTERS[piece.color][piece.type];

          const isSelected =
            selectedCoord !== null &&
            selectedCoord.x === piece.x &&
            selectedCoord.y === piece.y;
          const isMoving = piece.id === animatingPieceId;
          const isLifted = isSelected || isMoving;

          // Natural human hand lifting & calm gliding:
          // 850ms duration with cubic-bezier ease for dignified elder pace
          const transitionStyle = skipTransition
            ? 'none'
            : 'transform 850ms cubic-bezier(0.22, 1, 0.36, 1), filter 300ms ease';

          return (
            <g
              key={piece.id}
              onClick={(e) => {
                e.stopPropagation();
                handlePointClick(piece.x, piece.y);
              }}
              style={{
                transform: `translate3d(${cx}px, ${cy}px, 0) scale(${isLifted ? 1.15 : 1})`,
                transformOrigin: '0 0',
                transition: transitionStyle,
                willChange: 'transform',
              }}
              className="cursor-pointer select-none"
            >
              {/* Outer Piece Disk with Dynamic Normal / Lifted Drop Shadow */}
              <circle
                cx={0}
                cy={0}
                r={PIECE_RADIUS}
                fill={isRed ? 'url(#redPieceGrad)' : 'url(#blackPieceGrad)'}
                stroke={isRed ? '#9b2c2c' : '#1a202c'}
                strokeWidth={isLifted ? '3' : '2.5'}
                filter={isLifted ? 'url(#pieceLiftedShadow)' : 'url(#pieceNormalShadow)'}
              />

              {/* Inner Engraved Ring */}
              <circle
                cx={0}
                cy={0}
                r={PIECE_RADIUS - 3.5}
                fill="none"
                stroke={isRed ? '#c53030' : '#4a5568'}
                strokeWidth="1.2"
              />

              {/* Chinese Calligraphy Character */}
              <text
                x={0}
                y={8}
                textAnchor="middle"
                fontSize="24"
                fontWeight="900"
                fontFamily='"Noto Serif SC", "KaiTi", serif'
                fill={isRed ? '#b91c1c' : '#111827'}
                className="select-none pointer-events-none"
              >
                {char}
              </text>
            </g>
          );
        })}

        {/* Legal Target Move / Capture Highlights */}
        {legalTargets.map((target) => {
          const { cx, cy } = toSvgCoords(target.x, target.y);
          const isCapture = pieceMap.has(`${target.x},${target.y}`);

          return (
            <g
              key={`target-${target.x}-${target.y}`}
              onClick={(e) => {
                e.stopPropagation();
                handlePointClick(target.x, target.y);
              }}
              className="cursor-pointer"
            >
              {/* Invisible larger hit target for finger taps */}
              <circle cx={cx} cy={cy} r={PIECE_RADIUS + 4} fill="transparent" />

              {isCapture ? (
                // Capture indicator: crimson target ring
                <circle
                  cx={cx}
                  cy={cy}
                  r={PIECE_RADIUS + 3}
                  fill="none"
                  stroke="#e11d48"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  className="animate-spin"
                  style={{ animationDuration: '6s' }}
                />
              ) : (
                // Quiet move indicator: smooth emerald dot
                <circle
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="pointer-events-none"
                />
              )}
            </g>
          );
        })}

        {/* Global Click Handlers for Empty Intersections */}
        {Array.from({ length: 10 }).map((_, rank) =>
          Array.from({ length: 9 }).map((_, file) => {
            const key = `${file},${rank}`;
            if (pieceMap.has(key) || legalTargetSet.has(key)) return null;

            const { cx, cy } = toSvgCoords(file, rank);
            return (
              <circle
                key={`empty-point-${key}`}
                cx={cx}
                cy={cy}
                r={20}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => handlePointClick(file, rank)}
              />
            );
          })
        )}
      </svg>
    </div>
  );
};
