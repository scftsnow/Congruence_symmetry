/**
 * 도형 하나를 SVG로 렌더링
 *
 * 아이가 보는 화면이므로:
 * - 짙은 테두리 (파스텔 채우기와의 대비 확보)
 * - 선택 시 두께 강조 + 꼭짓점 표시 (대응점 학습에 도움)
 * - 히트 영역을 넉넉히 잡아 태블릿 터치가 편하도록
 */

import type { Shape, Transform } from '../geometry/types'
import { applyTransform } from '../geometry/transforms'
import { pointsToPath } from './svgPath'

interface ShapeSvgProps {
  shape: Shape
  transform: Transform
  /** 선택된 도형인지 */
  selected?: boolean
  /** 판정에 따른 하이라이트 색 (없으면 도형 기본색) */
  highlight?: string
  onPointerDown?: (e: React.PointerEvent) => void
  opacity?: number
}

export function ShapeSvg({
  shape,
  transform,
  selected = false,
  highlight,
  onPointerDown,
  opacity = 1,
}: ShapeSvgProps) {
  const points = applyTransform(shape.vertices, transform)
  const path = pointsToPath(points)

  return (
    <g
      onPointerDown={onPointerDown}
      style={{
        cursor: onPointerDown ? 'grab' : 'default',
        touchAction: 'none',
      }}
      opacity={opacity}
    >
      {/* 히트 영역 — 투명한 넓은 패스로 터치하기 쉽게 */}
      <path d={path} fill="transparent" stroke="transparent" strokeWidth={40} />
      <path
        d={path}
        fill={highlight ?? shape.color}
        stroke={selected ? '#023047' : '#1d3557'}
        strokeWidth={selected ? 4 : 2.5}
        strokeLinejoin="round"
      />
      {/* 꼭짓점 표시 — 대칭축·대응점을 찾을 때 힌트가 된다 */}
      {selected &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill="#023047" />
        ))}
    </g>
  )
}