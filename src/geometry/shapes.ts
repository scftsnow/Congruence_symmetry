/**
 * 기본 도형 정의
 *
 * 설계 원칙:
 * - 로컬 좌표계에 정의하고 중심이 원점 근처가 되도록 한다.
 * - 정점은 반시계 방향으로 나열한다 (면적 계산·방향 판정에 영향).
 * - 아이가 처음 보는 교과서 도형을 우선한다.
 */

import type { Point, Shape } from './types'

/** 정다각형 생성기 */
function regularPolygon(sides: number, radius: number, rotate = 0): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + rotate + (i * 2 * Math.PI) / sides
    return {
      x: Math.round(Math.cos(angle) * radius * 100) / 100,
      y: Math.round(Math.sin(angle) * radius * 100) / 100,
    }
  })
}

/** 마름모 */
function rhombus(w: number, h: number): Point[] {
  return [
    { x: 0, y: -h },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: -w, y: 0 },
  ]
}

/** 별 (5각 별) */
function star(points: number, outer: number, inner: number): Point[] {
  const verts: Point[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    verts.push({
      x: Math.round(Math.cos(angle) * r * 100) / 100,
      y: Math.round(Math.sin(angle) * r * 100) / 100,
    })
  }
  return verts
}

/** 하트 */
function heart(size: number): Point[] {
  return [
    { x: 0, y: size * 0.75 },
    { x: -size * 0.9, y: -size * 0.1 },
    { x: -size * 0.62, y: -size * 0.85 },
    { x: -size * 0.2, y: -size * 0.6 },
    { x: 0, y: -size * 0.28 },
    { x: size * 0.2, y: -size * 0.6 },
    { x: size * 0.62, y: -size * 0.85 },
    { x: size * 0.9, y: -size * 0.1 },
  ]
}

/** 나비 (좌우 대칭) */
function butterfly(size: number): Point[] {
  return [
    { x: 0, y: -size },
    { x: size * 0.7, y: -size * 0.55 },
    { x: size, y: -size * 0.1 },
    { x: size * 0.75, y: size * 0.25 },
    { x: size * 0.3, y: size * 0.35 },
    { x: 0, y: size * 0.2 },
    { x: -size * 0.3, y: size * 0.35 },
    { x: -size * 0.75, y: size * 0.25 },
    { x: -size, y: -size * 0.1 },
    { x: -size * 0.7, y: -size * 0.55 },
  ]
}

/**
 * 꽃 (6판)
 *
 * 6개의 바깥 꼭짓점과 그 사이의 홈(오목한 점)을 번갈아 배치한다.
 * 각도를 2*PI/petals 간격으로 돌려야 좌우·상하 대칭이 성립한다.
 */
function flower(size: number): Point[] {
  const petals = 6
  const verts: Point[] = []
  const step = (2 * Math.PI) / petals
  for (let i = 0; i < petals; i++) {
    const outer = -Math.PI / 2 + i * step
    verts.push({
      x: Math.round(Math.cos(outer) * size * 100) / 100,
      y: Math.round(Math.sin(outer) * size * 100) / 100,
    })
    const notch = outer + step / 2
    verts.push({
      x: Math.round(Math.cos(notch) * size * 0.45 * 100) / 100,
      y: Math.round(Math.sin(notch) * size * 0.45 * 100) / 100,
    })
  }
  return verts
}

/**
 * 기본 도형 목록
 *
 * 색상은 파스텔 톤 + 짙은 테두리로 아이가 구분하기 쉽게 한다.
 * (접근성: 기본값으로 고대비 확보)
 */
export const BASIC_SHAPES: Shape[] = [
  {
    id: 'triangle',
    name: '삼각형',
    kind: 'triangle',
    color: '#ffd166',
    vertices: [
      { x: 0, y: -62 },
      { x: 62, y: 48 },
      { x: -62, y: 48 },
    ],
  },
  {
    id: 'square',
    name: '정사각형',
    kind: 'square',
    color: '#8ecae6',
    vertices: [
      { x: -50, y: -50 },
      { x: 50, y: -50 },
      { x: 50, y: 50 },
      { x: -50, y: 50 },
    ],
  },
  {
    id: 'rectangle',
    name: '직사각형',
    kind: 'rectangle',
    color: '#a3d5a1',
    vertices: [
      { x: -82, y: -45 },
      { x: 82, y: -45 },
      { x: 82, y: 45 },
      { x: -82, y: 45 },
    ],
  },
  {
    id: 'circle',
    name: '원',
    kind: 'circle',
    color: '#b8b8ff',
    vertices: regularPolygon(32, 55),
  },
  {
    id: 'rhombus',
    name: '마름모',
    kind: 'rhombus',
    color: '#ffadad',
    vertices: rhombus(60, 44),
  },
  {
    id: 'pentagon',
    name: '정오각형',
    kind: 'pentagon',
    color: '#bde0fe',
    vertices: regularPolygon(5, 58),
  },
  {
    id: 'hexagon',
    name: '정육각형',
    kind: 'hexagon',
    color: '#caffbf',
    vertices: regularPolygon(6, 55),
  },
]

/** 생활 도형 (실생활 단원·자유 탐구용) */
export const LIFE_SHAPES: Shape[] = [
  {
    id: 'heart',
    name: '하트',
    kind: 'heart',
    color: '#ff8fa3',
    vertices: heart(60),
  },
  {
    id: 'star',
    name: '별',
    kind: 'star',
    color: '#ffe066',
    vertices: star(5, 62, 27),
  },
  {
    id: 'butterfly',
    name: '나비',
    kind: 'butterfly',
    color: '#d4a5ff',
    vertices: butterfly(58),
  },
  {
    id: 'flower',
    name: '꽃',
    kind: 'flower',
    color: '#ffc6ff',
    vertices: flower(58),
  },
]

/** 전체 도형 목록 */
export const ALL_SHAPES: Shape[] = [...BASIC_SHAPES, ...LIFE_SHAPES]

/** ID로 도형 찾기 */
export function findShape(id: string): Shape | undefined {
  return ALL_SHAPES.find((s) => s.id === id)
}

/**
 * 같은 ID를 가진 복사본 생성
 * (직접 그리기 모드에서 점 추가 시 원본 오염 방지)
 */
export function cloneShape(shape: Shape, newId: string): Shape {
  return {
    ...shape,
    id: newId,
    vertices: shape.vertices.map((v) => ({ ...v })),
  }
}