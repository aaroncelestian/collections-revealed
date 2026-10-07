import { createRoot, type Root } from 'react-dom/client'
import {
  MineralConstellation,
  type ConstellationBeatId,
} from './MineralConstellation'

export type ConstellationHandle = {
  setVisible: (visible: boolean) => void
  setRendering: (on: boolean) => void
  setPhase: (phase: ConstellationBeatId) => void
  dispose: () => void
}

/**
 * Mount the ORNL mineral-constellation motif into a host div as a React island.
 */
export function startConstellation(
  host: HTMLElement,
  options: { onDiveComplete: () => void },
): ConstellationHandle {
  let visible = false
  let rendering = false
  let phase: ConstellationBeatId = 'peri'
  const root: Root = createRoot(host)

  const paint = () => {
    const active = visible && rendering
    host.style.opacity = visible ? '1' : '0'
    host.style.pointerEvents = active ? 'auto' : 'none'
    // Keep the Canvas mounted while `rendering` so the opacity fade can finish;
    // unmount once holdThroughFade turns rendering off.
    if (!rendering) {
      root.render(null)
      return
    }
    root.render(
      <MineralConstellation
        active={active}
        beatId={phase}
        onDiveComplete={options.onDiveComplete}
      />,
    )
  }

  paint()

  return {
    setVisible(next) {
      visible = next
      paint()
    },
    setRendering(on) {
      rendering = on
      paint()
    },
    setPhase(next) {
      phase = next
      paint()
    },
    dispose() {
      root.unmount()
    },
  }
}
