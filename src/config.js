/*
  Facts, links and copy sourced from vexoai.com (/ring, /women-health, /waitlist, /privacy, /terms), Sept 2026.
  See STORYBOARD.md §1 for the source of every claim. Set SITE to '' to use relative links in production.
*/
export const SITE = 'https://www.vexoai.com'

/*
  What vexoai.com actually offers for the Ring (checked Sept 28 2026):
  · "Download on the App Store" → the Vexo Ring app          (primary CTA here)
  · "Join Waitlist" → /waitlist, live, email form             (secondary; set SHOW_WAITLIST = false to drop it)
  · No Ring checkout exists — the homepage /checkout sells Vexo Band.
*/
export const SHOW_WAITLIST = true

export const LINKS = {
  home: `${SITE}/ring`,
  waitlist: `${SITE}/waitlist`,
  women: `${SITE}/women-health`,
  privacy: `${SITE}/privacy`,
  terms: `${SITE}/terms`,
  hackathon: `${SITE}/hackathon`,
  app: 'https://apps.apple.com/us/app/vexo-ring/id6787324778',
  yc: 'https://www.ycombinator.com',
  email: 'mailto:info@vexoai.com',
  instagram: 'https://www.instagram.com/vexoring.ai/',
  x: 'https://x.com/VexoRing',
  linkedin: 'https://www.linkedin.com/company/vexoaiinc/',
}

// Official photography, served by Vexo's CDN (Access-Control-Allow-Origin: *). Used in the coda only.
export const PHOTOS = {
  moss: { src: `${SITE}/images/landing/footer-ring.webp`, alt: 'Silver Vexo Ring standing in moss under an open sky', w: 2400, h: 1355 },
  hand: { src: `${SITE}/images/landing/ring-onhand.png`, alt: 'Graphite Vexo Ring on the index finger of a runner', w: 1254, h: 1254 },
  gold: { src: `${SITE}/images/landing/ringinmotion.jpg`, alt: 'Gold Vexo Ring on a hand in motion', w: 1600, h: 893 },
  night: { src: `${SITE}/images/landing/haptics-night.jpg`, alt: 'Graphite Vexo Ring on a resting hand at night', w: 1600, h: 893 },
  women: { src: `${SITE}/images/women/teaser-wide.webp`, alt: 'Vexo women’s health', w: 2400, h: 1018 },
  film: { src: `${SITE}/videos/demo-reel.mp4?v=2`, poster: `${SITE}/videos/demo-reel-poster.jpg?v=2` },
}

// Finishes seen in Vexo's own photography: silver (footer), gold (women's health), graphite (on hand).
export const FINISHES = [
  { id: 'silver', label: 'Silver', swatch: '#d9d9d6' },
  { id: 'gold', label: 'Gold', swatch: '#d8b27a' },
  { id: 'graphite', label: 'Graphite', swatch: '#3b3c40' },
]

// Illustrative readings — the same sample values Vexo shows on /ring.
export const READINGS = {
  hr: 62,
  hrv: 46,
  spo2: 98,
  temp: '36.6°',
  resp: 14,
  sleep: '7h 12m',
}

// "Every app, one ring." — the apps named on /ring, plus women's health.
export const APPS = [
  { id: 'stride', name: 'Stride', kind: 'Running' },
  { id: 'matchday', name: 'Matchday', kind: 'Soccer' },
  { id: 'rally', name: 'Rally', kind: 'Pickleball' },
  { id: 'still', name: 'Still', kind: 'Meditation' },
  { id: 'plate', name: 'Plate', kind: 'Nutrition' },
  { id: 'dose', name: 'Dose', kind: 'Care' },
  { id: 'lift', name: 'Lift', kind: 'Strength' },
  { id: 'goals', name: 'Goals', kind: 'The long game' },
  { id: 'women', name: 'Women’s health', kind: 'Cycle · from nightly temperature' },
]
