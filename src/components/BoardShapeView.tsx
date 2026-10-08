/**
 * One shape on a board. Pressing it holds it.
 *
 * THE SHAPE IS DRAWN IN ITS OWN COORDINATES
 * -----------------------------------------
 * The outline is the shape's local vertices, and CSS moves it into place. It is
 * not the other way round.
 *
 * The earlier version recomputed absolute screen coordinates on every render and
 * drew those, so when the system turned a shape the path simply changed between
 * one frame and the next. There was nothing for a transition to animate: the
 * shape jumped from one angle to another with no indication that a turn had
 * happened at all, and the whole point of the stage is watching the turn.
 *
 * With the transform in CSS the browser interpolates it, so the shape swings
 * round. A quarter turn takes 600ms because that is long enough to follow with a
 * finger on the screen and short enough not to wait for.
 *
 * The label sits outside the transformed group. A syllable that spins with its
 * shape is no longer a name for it.
 *
 * This was the piece worth pulling out of what used to be `BoardParts.tsx`,
 * which held four unrelated things behind a name that described none of them.
 * This one is the reusable half: anything that lays shapes out and lets the child
 * pick one up can use it without the marks and the overlay.
 */

import type { BoardShape } from '../modes/useBoard'
import { pointsToPath } from './svgPath'

export function BoardShapeView({
  item,
  held,
  dragging,
  onPointerDown,
}: {
  item: BoardShape
  held: boolean
  /** true while this shape is under the child's finger */
  dragging: boolean
  onPointerDown: (item: BoardShape, e: React.PointerEvent) => void
}) {
  const d = pointsToPath(item.shape.vertices)

  return (
    <g onPointerDown={(e) => onPointerDown(item, e)} style={{ cursor: 'grab', touchAction: 'none' }}>
      <g
        className={
          ['board-shape', dragging ? 'board-shape--dragging' : '', held ? 'board-shape--held' : '']
            .filter(Boolean)
            .join(' ')
        }
        style={{
          transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg) scale(${item.flipped ? -1 : 1}, 1)`,
        }}
      >
        {/* generous hit area, sized for a child's finger */}
        <path d={d} fill="transparent" stroke="transparent" strokeWidth={48} />
        <path
          d={d}
          fill={item.shape.color}
          fillOpacity={held ? 0.55 : 0.75}
          stroke={held ? '#023047' : '#1d3557'}
          strokeWidth={held ? 4.5 : 2.5}
          strokeLinejoin="round"
        />
        {held &&
          item.shape.vertices.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={6} fill="#023047" />)}
      </g>
      <text
        x={item.x}
        y={item.y + 82}
        fontSize={26}
        fontWeight={700}
        fill="#023047"
        textAnchor="middle"
        style={{ pointerEvents: 'none' }}
      >
        {item.label}
      </text>
    </g>
  )
}