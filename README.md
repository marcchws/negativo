# Negativo

The booking app of Negativo, a bouldering and ropes gym in Humaitá, Rio de Janeiro. Climbers book classes that have a set number of spots and a waitlist, book open-climb slots by time, buy passes, rent shoes and harnesses, sign the waiver on their first visit and pass a belay check before ropes.

**Live demo:** https://negativo.pages.dev

> **Negativo is invented.** The gym, its coaches and members, the prices and every payment are made up. Card, Pix, 3-D Secure, pass credits and coupons are all mocked in the browser: nothing is sent anywhere and nothing is ever charged. Don't type a real card number.

## What you can try

The demo opens on **Caio Ventura**, a member with a 10-pass and 4 credits left, on **Tuesday 3 November 2026 at 17:20** in Rio. The clock starts there on every load, so "today", "in 3 h 10 min" and the cancel windows always read the same.

- **Schedule**: tonight's sessions with spots left, a now line, and goal cards for your next climb, your credits and how busy the gym is (hover, tap or use the arrow keys on the chart).
- **Class detail**: spots, coach, policies, and the one action the session allows: book, join the waitlist, leave it, or book a belay check first.
- **Checkout**: pay with credits, Pix or a card, add gear, apply a coupon.
- **Bookings**: cancel with the 12-hour rule. Up to 12 hours before, you get a full refund or the credit back. After that, you can pass your spot to the waitlist.
- **Passes**: single entry, 10-pass or monthly unlimited.

**Account → Demo** switches the scenario: first visit (Ana Lima, no waiver, no pass, no belay check), no credits left, a waitlist spot opening, slow network, a schedule that fails to load, and reset.

Demo payment values:

| Card ending | What the mocked bank does |
| --- | --- |
| 4242 | Approves |
| 9995 | Asks for a 3-D Secure code; any 6 digits work except 000000 |
| 0002 | Declines |
| 1111 | Expired |

Coupons: `FIRSTWALL` takes R$ 20 off on a first visit; `EXPIRED10` has expired. A Pix code lasts 30 minutes, and the Pix screen has a button that plays the bank's part.

Every state also has a direct link, for example [`/?state=card-3ds`](https://negativo.pages.dev/?state=card-3ds) or [`/?state=pix-ending`](https://negativo.pages.dev/?state=pix-ending). The names are listed in [`src/app/presets.ts`](src/app/presets.ts).

## Run it

Node 22 or later.

```sh
npm install
npm run dev        # http://localhost:5180
npm test           # rule tests: the 12-hour window, credit costs, coupons, cards, waitlist timers
npm run build      # static build in dist/
npm run e2e        # every state at 1440 and 390 px, with axe accessibility checks (needs `npx playwright install chromium` once)
```

Deploy on Cloudflare Pages with build command `npm run build` and output directory `dist`. There is no `404.html`, so Pages serves the app for every path and the app draws its own not-found page.

## Stack

- React 19, Vite, TypeScript (strict), React Router
- TanStack Query: booking and joining the waitlist update the screen at once and roll back if the call fails; the Pix screen polls the payment's status
- Tailwind CSS v4, with the brand's colours, radii and shadows as theme variables
- Radix primitives (dialog, radio group, switch, checkbox, toast) in the shadcn/ui pattern
- Mock Service Worker (MSW 2) as the only data source, in production too. Where a browser cannot register a service worker (a Firefox private window, for example), the same handlers answer from inside the page.
- Vitest for the booking rules, Playwright with axe-core for every state
- Hosted on Cloudflare Pages as a static build

The busy chart, the icons and the illustrations are Negativo's own components, with no chart or icon library.

## Credits

Photos from [Unsplash](https://unsplash.com) under the Unsplash License, self-hosted and cropped:

| Photo | By |
| --- | --- |
| The hall | [Malachi Brooks](https://unsplash.com/photos/PyGX4btztvA) |
| The lobby | [Declan Sun](https://unsplash.com/photos/vfCn2D6tz2o), cropped to the benches |
| Boulder session, 18:00 | [Yns Plt](https://unsplash.com/photos/NY1D4Zni7fc) |
| Boulder session, 20:00 | [Sabrina Wendl](https://unsplash.com/photos/h2NlwNkA2h8), with a sponsor's sign retouched out |
| Intro to Bouldering | [Tofan Teodor](https://unsplash.com/photos/gi2dUvCUVB8) |
| Lead Technique | [Stephanie Tuohy](https://unsplash.com/photos/e8NiXJfrCZw) |
| Movement Lab | [Beta Boulders](https://unsplash.com/photos/Eil7k7uTlrY), with the volume maker's marks retouched out |
| Coaches Marina and Rafa | [Beta Boulders](https://unsplash.com/photos/7luvAhiLVLc), [Beta Boulders](https://unsplash.com/photos/wp12LpP5Dw8) |
| Ropes session | [roya ann miller](https://unsplash.com/photos/AWJfZjHJwqc) |
| Belay check | [John Tuesday](https://unsplash.com/photos/zJFDPhVObwI) |
| Kids Crew | [Se. Tsuchiya](https://unsplash.com/photos/e5Xx0A7Vbng) |

The people in the photos are not the coaches or members named in the app.

Map tiles © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), loaded live under the OpenStreetMap tile usage policy.

Typeface: [Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk), SIL Open Font License, self-hosted through Fontsource.
