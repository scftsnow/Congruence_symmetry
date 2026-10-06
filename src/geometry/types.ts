/**
 * 기하 타입 정의
 *
 * 도형은 항상 "정점 목록 + 변환 정보"로 표현합니다.
 * 정규화된 정점(중심 원점)이 변환 적용 후 실제 좌표가 됩니다.
 */

/** 2차원 점 */
export interface Point {
  x: number
  y: number
}

/**
 * 도형 정의
 * - vertices: 로컬 좌표계의 정점 목록 (중심이 원점 근처가 되도록 정규화)
 * - shape: 도형 종류 (직접 그린 도형은 'custom')
 */
export interface Shape {
  id: string
  name: string
  vertices: Point[]
  /** 기본 채우기 색상 */
  color: string
  kind: ShapeKind
}

/** 도형 종류 — 기본 도형은 미리 정의, 직접 그리는 건 custom */
export type ShapeKind =
  | 'triangle'
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'rhombus'
  | 'pentagon'
  | 'hexagon'
  | 'heart'
  | 'star'
  | 'flower'
  | 'butterfly'
  | 'custom'

/**
 * 도형에 적용된 변환 상태
 * cx, cy : 캔버스 위 도형의 중심 위치
 * rotation : 회전 각도 (도 단위)
 * flipped : 좌우 반사 여부
 * scale : 크기 배율 (1 = 원래 크기)
 */
export interface Transform {
  cx: number
  cy: number
  rotation: number
  flipped: boolean
  scale: number
}

/** 변환까지 적용된 도형 = 화면에 그릴 수 있는 실제 좌표 */
export interface PlacedShape {
  shape: Shape
  transform: Transform
}

/**
 * 합동 판정 결과
 *
 * ⚠️ 모양(shape)과 크기(size)를 분리하는 것이 이 앱의 핵심 설계입니다.
 * 크기 조절 도구가 있으므로, 아이가 직접 "모양은 같은데 크기가 달라서
 * 합동이 아니구나"를 발견하게 해야 합니다.
 */
export interface CongruenceResult {
  /** 모양(형태)이 같은가 — 회전/반사를 무시하고 비교 */
  shapeMatches: boolean
  /** 크기가 같은가 */
  sizeMatches: boolean
  /** 모양 + 크기 모두 같으면 합동 */
  isCongruent: boolean
  /** 아이에게 보여줄 판정 종류 */
  verdict: CongruenceVerdict
  /** 관대하게 판정하기 위해 측정한 최대 편차 (px) */
  maxDeviation: number
}

export type CongruenceVerdict =
  /** 모양·크기 모두 같음 → 합동 */
  | 'congruent'
  /** 모양만 같음, 크기가 다름 */
  | 'shape-only'
  /** 전혀 다름 */
  | 'different'