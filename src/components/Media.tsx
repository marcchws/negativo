import type { CoachKey, PhotoKey } from '../domain/sessions'

/** Self-hosted Unsplash photos (Unsplash License), credited in the footer and the README. */
export const PHOTO_CREDITS: Record<PhotoKey | CoachKey, string> = {
  hall: 'Malachi Brooks',
  lobby: 'Declan Sun',
  boulderA: 'Yns Plt',
  boulderB: 'Sabrina Wendl',
  intro: 'Tofan Teodor',
  lead: 'Stephanie Tuohy',
  overhang: 'Beta Boulders',
  harness: 'roya ann miller',
  belay: 'John Tuesday',
  marina: 'Beta Boulders',
  rafa: 'Beta Boulders',
  holds: 'Se. Tsuchiya',
}

/** `square` is a 480 px centre crop for thumbnails; the default is the 1280 px wide original. */
export function Photo({ k, square = false, className, alt = '', eager = false }: { k: PhotoKey; square?: boolean; className?: string; alt?: string; eager?: boolean }) {
  return (
    <img
      className={className}
      src={`/photos/${k}${square ? '-sq' : ''}.webp`}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}

export function CoachFace({ k, className }: { k: CoachKey; className?: string }) {
  return <img className={className} src={`/photos/${k}-face.webp`} alt="" loading="lazy" decoding="async" />
}

/** A QR-looking pattern from a seed. It is drawn, not encoded: the codes in this demo point nowhere. */
export function QR({ seed, n = 29, label }: { seed: number; n?: number; label: string }) {
  let x = seed
  const rnd = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648
  const finder = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8)
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!finder(r, c) && rnd() > 0.5) d += `M${c} ${r}h1v1h-1z`
  const F = ({ r, c }: { r: number; c: number }) => (
    <>
      <rect x={c + 0.5} y={r + 0.5} width="6" height="6" fill="none" stroke="#1E1C1A" />
      <rect x={c + 2} y={r + 2} width="3" height="3" fill="#1E1C1A" />
    </>
  )
  return (
    <svg viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label}>
      <path d={d} fill="#1E1C1A" />
      <F r={0} c={0} />
      <F r={0} c={n - 7} />
      <F r={n - 7} c={0} />
    </svg>
  )
}

/**
 * Live OpenStreetMap tiles around Humaitá at zoom 16: four tiles for one small view, loaded only when the
 * detail opens, with the attribution on the map. That is the interactive viewing OSM's tile policy allows;
 * shipping the tiles as a saved image is not (operations.osmfoundation.org/policies/tiles, read 2026-11-02).
 */
export function GymMap() {
  const z = 16
  const lat = -22.9555
  const lon = -43.1985
  const n = 2 ** z
  const xf = ((lon + 180) / 360) * n
  const lr = (lat * Math.PI) / 180
  const yf = ((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2) * n
  const x0 = Math.floor(xf - 0.5)
  const y0 = Math.floor(yf - 0.5)
  const ox = (xf - x0) * 256
  const oy = (yf - y0) * 256
  return (
    <div className="map">
      <div className="tiles" style={{ left: `calc(50% - ${ox}px)`, top: `calc(50% - ${oy}px)` }}>
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx = 0, dy = 0]) => (
          <img key={`${dx}${dy}`} src={`https://tile.openstreetmap.org/${z}/${x0 + dx}/${y0 + dy}.png`} alt="" loading="lazy" />
        ))}
      </div>
      <span className="pinx" role="img" aria-label="Negativo Humaitá">
        <svg width="32" height="32" viewBox="0 0 20 20" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 17s5.5-5 5.5-9.2a5.5 5.5 0 0 0-11 0C4.5 12 10 17 10 17z" /><circle cx="10" cy="7.8" r="2" />
        </svg>
      </span>
      <a className="attr" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
  )
}
