import { PHOTO_CREDITS } from '../components/Media'

const UNIQUE = [...new Set(Object.values(PHOTO_CREDITS))]

export function Footer() {
  return (
    <footer className="mx-4 mt-12 mb-4 border-t border-line pt-5 text-[12px] leading-relaxed text-muted lg:mx-0">
      <p>
        <b className="text-ink">Negativo is a demo.</b> The gym, the people, the prices and every payment are invented and mocked; no
        card or Pix is ever charged.
      </p>
      <p className="mt-1">
        Photos by {UNIQUE.join(', ')} on{' '}
        <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="underline">Unsplash</a>. Map ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>.
      </p>
    </footer>
  )
}
