//#region src/geometry/overlap.ts
/** Signed area; sign tells us winding, which clipping depends on. */
function signedArea(poly) {
	let sum = 0;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		sum += a.x * b.y - b.x * a.y;
	}
	return sum / 2;
}
/** Keep CCW winding so the clipper's inside test is consistent. */
function toCounterClockwise(poly) {
	return signedArea(poly) < 0 ? [...poly].reverse() : poly;
}
/** Point on which side of the directed edge a->b the point lies. */
function side(a, b, p) {
	return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}
/** Where segment p->q crosses the infinite line through a->b. */
function intersect(p, q, a, b) {
	const r = {
		x: q.x - p.x,
		y: q.y - p.y
	};
	const s = {
		x: b.x - a.x,
		y: b.y - a.y
	};
	const denom = r.x * s.y - r.y * s.x;
	if (Math.abs(denom) < 1e-12) return q;
	const t = ((a.x - p.x) * s.y - (a.y - p.y) * s.x) / denom;
	return {
		x: p.x + t * r.x,
		y: p.y + t * r.y
	};
}
/**
* Sutherland-Hodgman: clip `subject` against one half-plane.
* The clip polygon must be counter-clockwise.
*/
function clipToEdge(subject, a, b) {
	const out = [];
	const n = subject.length;
	if (n === 0) return out;
	for (let i = 0; i < n; i++) {
		const current = subject[i];
		const previous = subject[(i - 1 + n) % n];
		const currentInside = side(a, b, current) >= 0;
		const previousInside = side(a, b, previous) >= 0;
		if (currentInside) {
			if (!previousInside) out.push(intersect(previous, current, a, b));
			out.push(current);
		} else if (previousInside) out.push(intersect(previous, current, a, b));
	}
	return out;
}
/**
* Intersection polygon of two simple polygons, or null when they do not meet.
*
* Order matters only for convex clip regions; for the shapes this app draws
* it produces the shared region faithfully.
*/
function intersectPolygons(subject, clip) {
	if (subject.length < 3 || clip.length < 3) return null;
	let output = toCounterClockwise(subject);
	const clipper = toCounterClockwise(clip);
	for (let i = 0; i < clipper.length; i++) {
		if (output.length === 0) return null;
		const a = clipper[i];
		const b = clipper[(i + 1) % clipper.length];
		output = clipToEdge(output, a, b);
	}
	if (output.length < 3) return null;
	return output;
}
/** Absolute area of a polygon. */
function polygonArea(poly) {
	return Math.abs(signedArea(poly));
}
/** Is a point inside a polygon? Used to sample coverage. */
function pointInPolygon(p, poly) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i];
		const b = poly[j];
		if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
	}
	return inside;
}
/**
* Measure how much two polygons coincide.
*
* `coverage` is sampled rather than computed from the clipped polygon so the
* number stays meaningful for shapes whose intersection is several disjoint
* lobes, which the single-polygon clipper would merge.
*/
function measureOverlap(a, b) {
	if (a.length < 3 || b.length < 3) return {
		intersection: null,
		coverage: 0,
		reverseCoverage: 0,
		contained: false
	};
	const areaA = polygonArea(a);
	const areaB = polygonArea(b);
	if (areaA === 0 || areaB === 0) return {
		intersection: null,
		coverage: 0,
		reverseCoverage: 0,
		contained: false
	};
	const inter = intersectPolygons(a, b);
	const SAMPLES = 48;
	let inA = 0;
	let inBoth = 0;
	let inB = 0;
	let inBothFromB = 0;
	const minX = Math.min(...a.map((p) => p.x));
	const maxX = Math.max(...a.map((p) => p.x));
	const minY = Math.min(...a.map((p) => p.y));
	const maxY = Math.max(...a.map((p) => p.y));
	for (let iy = 0; iy < SAMPLES; iy++) for (let ix = 0; ix < SAMPLES; ix++) {
		const p = {
			x: minX + (ix + .5) / SAMPLES * (maxX - minX),
			y: minY + (iy + .5) / SAMPLES * (maxY - minY)
		};
		const inAHere = pointInPolygon(p, a);
		const inBHere = pointInPolygon(p, b);
		if (inAHere) inA++;
		if (inBHere) inB++;
		if (inAHere && inBHere) {
			inBoth++;
			inBothFromB++;
		}
	}
	const coverage = inA === 0 ? 0 : inBoth / inA;
	const reverseCoverage = inB === 0 ? 0 : inBothFromB / inB;
	return {
		intersection: inter,
		coverage,
		reverseCoverage,
		contained: coverage > .98 || reverseCoverage > .98
	};
}
//#endregion
//#region src/geometry/transforms.ts
var DEG = Math.PI / 180;
/** 기본 변환값 */
var identity = (cx, cy) => ({
	cx,
	cy,
	rotation: 0,
	flipped: false,
	scale: 1
});
/** 점 회전 (원점 기준) */
function rotatePoint(p, angleDeg) {
	const a = angleDeg * DEG;
	const c = Math.cos(a);
	const s = Math.sin(a);
	return {
		x: p.x * c - p.y * s,
		y: p.x * s + p.y * c
	};
}
/**
* 로컬 정점 + 변환 → 화면 좌표
*
* 순서: 스케일 → 반사 → 회전 → 평행이동
*/
function applyTransform(vertices, t) {
	return vertices.map((v) => {
		let x = v.x * t.scale;
		let y = v.y * t.scale;
		if (t.flipped) x = -x;
		const r = rotatePoint({
			x,
			y
		}, t.rotation);
		x = r.x;
		y = r.y;
		return {
			x: x + t.cx,
			y: y + t.cy
		};
	});
}
//#endregion
//#region src/geometry/shapes.ts
/** 정다각형 생성기 */
function regularPolygon(sides, radius, rotate = 0) {
	return Array.from({ length: sides }, (_, i) => {
		const angle = -Math.PI / 2 + rotate + i * 2 * Math.PI / sides;
		return {
			x: Math.round(Math.cos(angle) * radius * 100) / 100,
			y: Math.round(Math.sin(angle) * radius * 100) / 100
		};
	});
}
/** 마름모 */
function rhombus(w, h) {
	return [
		{
			x: 0,
			y: -h
		},
		{
			x: w,
			y: 0
		},
		{
			x: 0,
			y: h
		},
		{
			x: -w,
			y: 0
		}
	];
}
/** 별 (5각 별) */
function star(points, outer, inner) {
	const verts = [];
	for (let i = 0; i < points * 2; i++) {
		const r = i % 2 === 0 ? outer : inner;
		const angle = -Math.PI / 2 + i * Math.PI / points;
		verts.push({
			x: Math.round(Math.cos(angle) * r * 100) / 100,
			y: Math.round(Math.sin(angle) * r * 100) / 100
		});
	}
	return verts;
}
/** 하트 */
function heart(size) {
	return [
		{
			x: 0,
			y: size * .75
		},
		{
			x: -size * .9,
			y: -size * .1
		},
		{
			x: -size * .62,
			y: -size * .85
		},
		{
			x: -size * .2,
			y: -size * .6
		},
		{
			x: 0,
			y: -size * .28
		},
		{
			x: size * .2,
			y: -size * .6
		},
		{
			x: size * .62,
			y: -size * .85
		},
		{
			x: size * .9,
			y: -size * .1
		}
	];
}
/** 나비 (좌우 대칭) */
function butterfly(size) {
	return [
		{
			x: 0,
			y: -size
		},
		{
			x: size * .7,
			y: -size * .55
		},
		{
			x: size,
			y: -size * .1
		},
		{
			x: size * .75,
			y: size * .25
		},
		{
			x: size * .3,
			y: size * .35
		},
		{
			x: 0,
			y: size * .2
		},
		{
			x: -size * .3,
			y: size * .35
		},
		{
			x: -size * .75,
			y: size * .25
		},
		{
			x: -size,
			y: -size * .1
		},
		{
			x: -size * .7,
			y: -size * .55
		}
	];
}
/**
* 꽃 (6판)
*
* 6개의 바깥 꼭짓점과 그 사이의 홈(오목한 점)을 번갈아 배치한다.
* 각도를 2*PI/petals 간격으로 돌려야 좌우·상하 대칭이 성립한다.
*/
function flower(size) {
	const petals = 6;
	const verts = [];
	const step = 2 * Math.PI / petals;
	for (let i = 0; i < petals; i++) {
		const outer = -Math.PI / 2 + i * step;
		verts.push({
			x: Math.round(Math.cos(outer) * size * 100) / 100,
			y: Math.round(Math.sin(outer) * size * 100) / 100
		});
		const notch = outer + step / 2;
		verts.push({
			x: Math.round(Math.cos(notch) * size * .45 * 100) / 100,
			y: Math.round(Math.sin(notch) * size * .45 * 100) / 100
		});
	}
	return verts;
}
/**
* 기본 도형 목록
*
* 색상은 파스텔 톤 + 짙은 테두리로 아이가 구분하기 쉽게 한다.
* (접근성: 기본값으로 고대비 확보)
*/
var BASIC_SHAPES = [
	{
		id: "triangle",
		name: "삼각형",
		kind: "triangle",
		color: "#ffd166",
		vertices: [
			{
				x: 0,
				y: -62
			},
			{
				x: 62,
				y: 48
			},
			{
				x: -62,
				y: 48
			}
		]
	},
	{
		id: "square",
		name: "정사각형",
		kind: "square",
		color: "#8ecae6",
		vertices: [
			{
				x: -50,
				y: -50
			},
			{
				x: 50,
				y: -50
			},
			{
				x: 50,
				y: 50
			},
			{
				x: -50,
				y: 50
			}
		]
	},
	{
		id: "rectangle",
		name: "직사각형",
		kind: "rectangle",
		color: "#a3d5a1",
		vertices: [
			{
				x: -82,
				y: -45
			},
			{
				x: 82,
				y: -45
			},
			{
				x: 82,
				y: 45
			},
			{
				x: -82,
				y: 45
			}
		]
	},
	{
		id: "circle",
		name: "원",
		kind: "circle",
		color: "#b8b8ff",
		vertices: regularPolygon(32, 55)
	},
	{
		id: "rhombus",
		name: "마름모",
		kind: "rhombus",
		color: "#ffadad",
		vertices: rhombus(60, 44)
	},
	{
		id: "pentagon",
		name: "정오각형",
		kind: "pentagon",
		color: "#bde0fe",
		vertices: regularPolygon(5, 58)
	},
	{
		id: "hexagon",
		name: "정육각형",
		kind: "hexagon",
		color: "#caffbf",
		vertices: regularPolygon(6, 55)
	}
];
/** 생활 도형 (실생활 단원·자유 탐구용) */
var LIFE_SHAPES = [
	{
		id: "heart",
		name: "하트",
		kind: "heart",
		color: "#ff8fa3",
		vertices: heart(60)
	},
	{
		id: "star",
		name: "별",
		kind: "star",
		color: "#ffe066",
		vertices: star(5, 62, 27)
	},
	{
		id: "butterfly",
		name: "나비",
		kind: "butterfly",
		color: "#d4a5ff",
		vertices: butterfly(58)
	},
	{
		id: "flower",
		name: "꽃",
		kind: "flower",
		color: "#ffc6ff",
		vertices: flower(58)
	}
];
/** 전체 도형 목록 */
var ALL_SHAPES = [...BASIC_SHAPES, ...LIFE_SHAPES];
/** ID로 도형 찾기 */
function findShape(id) {
	return ALL_SHAPES.find((s) => s.id === id);
}
//#endregion
//#region dbg2.ts
var SQ = findShape("square");
for (const dx of [
	0,
	10,
	30,
	60,
	90,
	100,
	150
]) {
	const i = measureOverlap(applyTransform(SQ.vertices, identity(300, 300)), applyTransform(SQ.vertices, {
		...identity(300, 300),
		cx: 300 + dx
	}));
	console.log(`dx=${dx}`.padEnd(8), "cov=", i.coverage.toFixed(3), "rev=", i.reverseCoverage.toFixed(3), "contained=", i.contained);
}
//#endregion
export {};
