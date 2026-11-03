import { useLayoutEffect, useRef, useState } from 'react'
import type { HourLoad } from '../../domain/occupancy'
import { busyWord } from '../../domain/occupancy'

/**
 * How busy today, Negativo's own bar chart (no chart library): hover, tap or the arrow keys pick an hour and a tooltip
 * reads it out; Escape or leaving clears it. The card's headline follows the picked hour.
 */
export function BusyCard({ hours }: { hours: HourLoad[] }) {
  const nowHour = hours.find(h => h.kind === 'now')?.hour ?? hours[0]?.hour ?? 6
  const [sel, setSel] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const tip = useRef<HTMLSpanElement>(null)
  const [tipPos, setTipPos] = useState<{ left: number; arrow: number } | null>(null)
  const shown = hours.find(h => h.hour === (sel ?? nowHour))
  const picked = sel === null ? null : hours.find(h => h.hour === sel)

  useLayoutEffect(() => {
    if (!picked || !box.current || !tip.current) return setTipPos(null)
    const bar = box.current.querySelector<HTMLElement>(`[data-hour="${picked.hour}"]`)
    if (!bar) return
    const bx = box.current.getBoundingClientRect()
    const r = bar.getBoundingClientRect()
    const half = tip.current.offsetWidth / 2
    const c = r.left + r.width / 2 - bx.left
    const left = Math.min(Math.max(c, half), bx.width - half)
    setTipPos({ left, arrow: c - left + half })
  }, [picked])

  const move = (d: number) => {
    const first = hours[0]?.hour ?? 6
    const last = hours[hours.length - 1]?.hour ?? 23
    setSel(h => Math.min(last, Math.max(first, (h ?? nowHour) + d)))
  }

  return (
    <article className="goal">
      <span className="t-label">How busy · today</span>
      <div className="row">
        <div className="big">{shown ? busyWord(shown.percent) : ''}</div>
        <span className="small">
          ~{shown?.climbers} climbers {shown?.hour === nowHour ? 'now' : `at ${shown?.hour}:00`}
        </span>
      </div>
      <div className="relative">
        <div
          ref={box}
          className="busy"
          role="listbox"
          tabIndex={0}
          aria-label="Occupancy by hour. Use the arrow keys to move, Escape to clear."
          aria-activedescendant={picked ? `busy-${picked.hour}` : undefined}
          onKeyDown={e => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault()
              move(e.key === 'ArrowRight' ? 1 : -1)
            }
            if (e.key === 'Escape' && sel !== null) {
              e.stopPropagation()
              setSel(null)
            }
          }}
          onBlur={() => setSel(null)}
          onPointerLeave={e => e.pointerType === 'mouse' && setSel(null)}
        >
          {hours.map(h => (
            <span
              key={h.hour}
              id={`busy-${h.hour}`}
              role="option"
              data-hour={h.hour}
              aria-selected={h.hour === (sel ?? nowHour)}
              aria-label={`${h.hour}:00, ${h.percent}% full, ${h.kind}`}
              className={`bar-h ${h.kind}`}
              onPointerEnter={() => setSel(h.hour)}
              onClick={() => setSel(h.hour)}
            >
              <i style={{ height: `${Math.max(8, h.percent)}%` }} />
            </span>
          ))}
        </div>
        {/* Outside the listbox, which may only hold options. */}
        {picked ? (
          <span
            ref={tip}
            className="tip"
            role="status"
            style={tipPos ? { left: tipPos.left, ['--arrow' as string]: `${tipPos.arrow}px` } : { visibility: 'hidden' }}
          >
            <b>{picked.hour}:00</b> · {picked.percent}% full · ~{picked.climbers} climbers ({picked.kind})
          </span>
        ) : null}
      </div>
      <div className="busy-axis" aria-hidden="true"><span>06</span><span>12</span><span>18</span><span>23</span></div>
    </article>
  )
}
