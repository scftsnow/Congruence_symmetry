/**
 * SVG path 문자열 변환 유틸
 *
 * 컴포넌트와 분리해 Fast Refresh가 정상 동작하도록 한다.
 */

import type { Point } from '../geometry/types'

/** 정점 목록 → 닫힌 path (도형) */
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    // 점 하나: 미세한 선으로 그려 보이게 한다
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.01} ${points[0].y}`
  }
  const [first, ...rest] = points
  return `M ${first.x} ${first.y} L ${rest.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`
}

/** 점 목록 → 열린 polyline (대칭축 등) */
export function pointsToPolyline(points: Point[]): string {
  if (points.length === 0) return ''
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`
}