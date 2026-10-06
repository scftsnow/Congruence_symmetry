/**
 * 변환 연산 — 이동 · 회전 · 반사 · 확대/축소
 *
 * 순서: 스케일 → 반사 → 회전 → 이동
 * (도형의 로컬 좌표를 조작해 화면 좌표로 변환합니다)
 */

import type { Point, Transform } from './types'

export const DEG = Math.PI / 180

/** 기본 변환값 */
export const identity = (cx: number, cy: number): Transform => ({
  cx,
  cy,
  rotation: 0,
  flipped: false,
  scale: 1,
})

/** 점 회전 (원점 기준) */
export function rotatePoint(p: Point, angleDeg: number): Point {
  const a = angleDeg * DEG
  const c = Math.cos(a)
  const s = Math.sin(a)
  return {
    x: p.x * c - p.y * s,
    y: p.x * s + p.y * c,
  }
}

/** 점의 중심 */
export function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / points.length, y: sum.y / points.length }
}

/**
 * 도형의 바운딩 박스 중심 (표시용 중심)
 *
 * 꼭짓점 수평균(centroid)과 다를 수 있으므로,
 * 화면에 놓을 위치 계산에는 바운딩 박스 중심을 씁니다.
 */
export function bboxCenter(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

/**
 * 로컬 정점 + 변환 → 화면 좌표
 *
 * 순서: 스케일 → 반사 → 회전 → 평행이동
 */
export function applyTransform(vertices: Point[], t: Transform): Point[] {
  return vertices.map((v) => {
    // 1) 스케일
    let x = v.x * t.scale
    let y = v.y * t.scale

    // 2) 좌우 반사 (x축 부호 반전)
    if (t.flipped) x = -x

    // 3) 회전
    const r = rotatePoint({ x, y }, t.rotation)
    x = r.x
    y = r.y

    // 4) 평행이동
    return { x: x + t.cx, y: y + t.cy }
  })
}

/** 정점 목록을 경계 상자 중심으로 재조정 (원점 근처에 두기) */
export function normalizeToOrigin(points: Point[]): Point[] {
  const c = bboxCenter(points)
  return points.map((p) => ({ x: p.x - c.x, y: p.y - c.y }))
}

/** 두 점을 잇는 선분의 중점 */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** 두 점 사이 거리 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * 대칭이동 (선대칭)
 * 직선 line 위를 기준으로 반사합니다.
 *
 * @param p 반사할 점
 * @param line 대칭축 (점 a, b)
 */
export function reflectAcrossLine(p: Point, a: Point, b: Point): Point {
  // 직선 방향 벡터
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return p

  // p를 직선에 투영
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  const projX = a.x + t * dx
  const projY = a.y + t * dy

  // 투영점 기준으로 반사
  return { x: 2 * projX - p.x, y: 2 * projY - p.y }
}

/**
 * 점대칭 (180도 회전)
 * 중심 point 기준으로 180도 돌립니다.
 */
export function rotate180(p: Point, center: Point): Point {
  return { x: 2 * center.x - p.x, y: 2 * center.y - p.y }
}