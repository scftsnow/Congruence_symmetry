/**
 * One shape, drawn in SVG.
 *
 * `fillOpacity` exists for the stacking screen: with both shapes semi
 * transparent the child can see the one behind, so overlapping is something
 * they observe rather than something the app tells them.
 */

import type { Shape, Transform } from '../geometry/types'
import { applyTransform } from '../geometry/transforms'
import { pointsToPath } from './svgPath'

interface ShapeSvgProps {
  shape: Shape
  transform: Transform
  /** outlined but not filled, for the shape being moved */
  ghost?: boolean
  /** stroke colour override, used for the selected shape */
  stroke?: string
  strokeWidth?: number
  /** 0..1; below 1 lets the shape behind show through */
  fillOpacity?: number
  showVertices?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  opacity?: number
}

export function ShapeSvg({
  shape,
  transform,
  ghost = false,
  stroke,
  strokeWidth,
  fillOpacity = 1,
  showVertices = false,
  onPointerDown,
  opacity = 1,
}: ShapeSvgProps) {
  const points = applyTransform(shape.vertices, transform)
  const path = pointsToPath(points)
  const strokeColor = stroke ?? (ghost ? '#023047' : '#1d3557')

  return (
    <g
      onPointerDown={onPointerDown}
      style={{
        cursor: onPointerDown ? 'grab' : 'default',
        touchAction: 'none',
      }}
      opacity={opacity}
    >
      {/* generous transparent hit area so a child's finger lands on it */}
      <path d={path} fill="transparent" stroke="transparent" strokeWidth={44} />

      <path
        d={path}
        fill={ghost ? 'none' : shape.color}
        fillOpacity={ghost ? 0 : fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth ?? (ghost ? 2.5 : 2.5)}
        strokeDasharray={ghost ? '8 6' : undefined}
        strokeLinejoin="round"
      />

      {showVertices &&
        points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill={strokeColor} />)}
    </g>
  )
}