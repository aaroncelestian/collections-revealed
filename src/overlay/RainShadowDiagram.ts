/**
 * Why Searles Lake is dry, in four presses.
 *
 * Stage 0 is the bare geography. Each later stage adds one idea and nothing
 * else: storms arrive, the Sierra strips the rain out of them, the basin
 * evaporates down to salt. Built as inline SVG so the reveals are plain class
 * toggles and the whole thing stays crisp at projector scale.
 */
/**
 * The scene lives in the top 700 units. Everything below is a deliberate dead
 * band, because the beat copy lands bottom-left and the presenter HUD sits
 * bottom-right.
 */
const MARKUP = `
<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" role="img"
     aria-label="Diagram: Pacific storms lose their rain over the Sierra Nevada, leaving the Searles basin dry">
  <defs>
    <linearGradient id="rs-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#182943"/>
      <stop offset="0.62" stop-color="#3c5a7d"/>
      <stop offset="1" stop-color="#0b1220"/>
    </linearGradient>
    <linearGradient id="rs-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2f6f96"/>
      <stop offset="1" stop-color="#14324a"/>
    </linearGradient>
    <linearGradient id="rs-ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#584b3b"/>
      <stop offset="1" stop-color="#1b160f"/>
    </linearGradient>
    <linearGradient id="rs-salt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6f3e9"/>
      <stop offset="1" stop-color="#cfc7b2"/>
    </linearGradient>
    <marker id="rs-arrow" viewBox="0 0 12 12" refX="9" refY="6"
            markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 L12 6 L0 12 Z" fill="#ffe566"/>
    </marker>
  </defs>

  <rect width="1920" height="1080" fill="url(#rs-sky)"/>

  <!-- Ocean, then the range, then the basin floor -->
  <path d="M0 468 L268 468 L268 720 L0 720 Z" fill="url(#rs-sea)"/>
  <path d="M268 468 L430 452 L560 372 L660 258 L716 196 L790 268 L900 392 L1010 470 L1150 512 L1920 528 L1920 720 L268 720 Z"
        fill="url(#rs-ground)"/>
  <path d="M660 258 L716 196 L790 268 L744 282 L716 246 L690 280 Z" fill="#eef2f8"/>

  <g font-family="Gill Sans, Franklin Gothic Book, Calibri, Arial, sans-serif"
     font-size="34" font-weight="600" fill="#ffffff" opacity="0.82">
    <text x="40" y="560">Pacific</text>
    <text x="716" y="156" text-anchor="middle">Sierra Nevada</text>
    <text x="1180" y="608" text-anchor="start">Searles basin</text>
  </g>

  <!-- Stage 1: storms come in off the ocean -->
  <g class="rs-stage rs-stage-1">
    <g fill="#d9e2ec">
      <ellipse cx="150" cy="268" rx="118" ry="50"/>
      <ellipse cx="238" cy="240" rx="88" ry="58"/>
      <ellipse cx="330" cy="274" rx="100" ry="46"/>
      <ellipse cx="424" cy="250" rx="78" ry="50"/>
    </g>
    <path d="M96 372 L336 372" stroke="#ffe566" stroke-width="9" fill="none"
          stroke-linecap="round" marker-end="url(#rs-arrow)"/>
  </g>

  <!-- Stage 2: the range wrings them out on the way up -->
  <g class="rs-stage rs-stage-2">
    <g stroke="#9fd4f2" stroke-width="7" stroke-linecap="round" opacity="0.95">
      <path d="M170 330 L146 404"/>
      <path d="M222 322 L198 414"/>
      <path d="M274 336 L250 406"/>
      <path d="M326 328 L302 418"/>
      <path d="M378 334 L354 400"/>
      <path d="M430 324 L406 396"/>
      <path d="M482 340 L458 404"/>
    </g>
    <g fill="#d9e2ec" opacity="0.5">
      <ellipse cx="540" cy="248" rx="86" ry="40"/>
      <ellipse cx="626" cy="228" rx="66" ry="34"/>
    </g>
    <text x="300" y="448" text-anchor="middle" fill="#9fd4f2" font-size="38" font-weight="600"
          font-family="Gill Sans, Franklin Gothic Book, Calibri, Arial, sans-serif">the rain falls here</text>
    <g fill="#d9e2ec" opacity="0.22">
      <ellipse cx="1020" cy="234" rx="84" ry="28"/>
      <ellipse cx="1146" cy="222" rx="62" ry="22"/>
    </g>
    <text x="1330" y="330" text-anchor="middle" fill="#ffe566" font-size="38" font-weight="600"
          font-family="Gill Sans, Franklin Gothic Book, Calibri, Arial, sans-serif">nothing left by here</text>
  </g>

  <!-- Stage 3: the basin evaporates down to a salt pan -->
  <g class="rs-stage rs-stage-3">
    <ellipse cx="1540" cy="648" rx="268" ry="54" fill="url(#rs-salt)"/>
    <ellipse cx="1540" cy="648" rx="136" ry="26" fill="#e8437c" opacity="0.9"/>
    <g stroke="#ffe566" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.92">
      <path d="M1424 586 L1424 512" marker-end="url(#rs-arrow)"/>
      <path d="M1540 586 L1540 494" marker-end="url(#rs-arrow)"/>
      <path d="M1656 586 L1656 512" marker-end="url(#rs-arrow)"/>
    </g>
    <text x="1540" y="452" text-anchor="middle" fill="#ffe566" font-size="38" font-weight="600"
          font-family="Gill Sans, Franklin Gothic Book, Calibri, Arial, sans-serif">the water leaves</text>
  </g>
</svg>
`

import { setLayerVisible } from './layerVisibility'

export class RainShadowDiagram {
  private readonly root: HTMLElement
  private stage = -1

  constructor(root: HTMLElement) {
    this.root = root
    this.root.innerHTML = MARKUP
  }

  show(stage: number) {
    if (stage === this.stage) return
    this.stage = stage
    for (let i = 1; i <= 3; i++) {
      const group = this.root.querySelector(`.rs-stage-${i}`)
      group?.classList.toggle('is-visible', stage >= i)
    }
  }

  setVisible(visible: boolean) {
    setLayerVisible(this.root, visible)
  }
}
