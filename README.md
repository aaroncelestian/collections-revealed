# Collections Revealed — Life in Salt

Presenter-driven stage build for NHM **Collections Revealed**. Story: **Boulby Mine** salt + astrobiology from [What Woke Up](https://aaroncelestian.substack.com/p/what-woke-up).

## Quick start

```bash
npm install
npm run dev
```

## Presenter controls

| Input | Action |
| --- | --- |
| `Space` / `→` / clicker Next | Next beat |
| `←` / clicker Back | Previous beat |
| `1`–`9` | Jump to beats 1–9 |
| `0` | Jump to beat 10 |
| `H` | Toggle HUD |
| `F` | Force static fallback |

## 13 beats

1. Cold Open — live MineralSciences **halite hero**
2. The Team — surface crew photo
3. Boulby Surface
4. Descent — tunnel
5. Salt World — ceiling stalactites
6. Closed Section — wood cribs
7. Darkness — Aaron & Scott
8. The Lake — brine clip (local or YouTube)
9. The Reveal — bacteria / inclusion clip
10. Explainer — hero dive + labels
11. The Bridge — look for life in salt out there
12. So-What
13. Send-off

## Halite hero

Uses your MineralSciences `hero-halite.js` + `hero/halite-theatre.json` (Theatre zoom loop, DOF, scale bar, focus rack).

## Movies / YouTube

When clips are on YouTube, set `youtubeId` on the lake/reveal beats in `src/beats/catalog.ts`. Local mp4s under `public/assets/video/` remain as rehearsal fallbacks. Prefer a local offline build for auditorium wifi risk.
