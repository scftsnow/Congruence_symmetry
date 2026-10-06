/**
 * 도구 바
 *
 * 아이가 쓰는 4가지 조작: 옮기기 / 돌리기 / 뒤집기 / 크기
 *
 * ⚠️ 태블릿에서 아이 손가락으로 치기 쉬워야 한다.
 *    각 버튼은 최소 64px 높이를 유지한다.
 */

import type { DragMode } from '../modes/useStackPractice'

interface ToolBarProps {
  tool: DragMode
  onToolChange: (t: DragMode) => void
  onRotateBy: (deg: number) => void
  onFlip: () => void
  onScaleBy: (f: number) => void
  onReset: () => void
}

const TOOLS: Array<{ id: DragMode; label: string; icon: string }> = [
  { id: 'move', label: '옮기기', icon: '✋' },
  { id: 'rotate', label: '돌리기', icon: '🔄' },
  { id: 'flip', label: '뒤집기', icon: '🪞' },
  { id: 'scale', label: '크기', icon: '🔍' },
]

export function ToolBar({
  tool,
  onToolChange,
  onRotateBy,
  onFlip,
  onScaleBy,
  onReset,
}: ToolBarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="도형 조작 도구">
      <div className="toolbar__tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tool-btn ${tool === t.id ? 'tool-btn--active' : ''}`}
            onClick={() => onToolChange(t.id)}
            aria-pressed={tool === t.id}
          >
            <span className="tool-btn__icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tool-btn__label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* 현재 도구에 따른 보조 조작 */}
      <div className="toolbar__actions">
        {tool === 'rotate' && (
          <>
            <button type="button" className="mini-btn" onClick={() => onRotateBy(-90)}>
              ↺ 90°
            </button>
            <button type="button" className="mini-btn" onClick={() => onRotateBy(90)}>
              ↻ 90°
            </button>
            <button type="button" className="mini-btn" onClick={() => onRotateBy(45)}>
              45°
            </button>
          </>
        )}
        {tool === 'flip' && (
          <button type="button" className="mini-btn" onClick={onFlip}>
            🪞 뒤집기
          </button>
        )}
        {tool === 'scale' && (
          <>
            <button type="button" className="mini-btn" onClick={() => onScaleBy(0.8)}>
              🔽 작게
            </button>
            <button type="button" className="mini-btn" onClick={() => onScaleBy(1.25)}>
              🔼 크게
            </button>
          </>
        )}
        {tool === 'move' && (
          <span className="toolbar__hint">
            도형을 <strong>끌어서</strong> 왼쪽 도형에 겹쳐 보게
          </span>
        )}
        <button type="button" className="mini-btn mini-btn--ghost" onClick={onReset}>
          ↺ 처음부터
        </button>
      </div>
    </div>
  )
}