/*
  Facts, links and copy for Vexo Band, sourced from vexoai.com (home, /checkout, /privacy, /terms)
  and Vexo's YC company page, Sept 28 2026. STORYBOARD.md §1 lists the source of every claim.
  Set SITE to '' to use relative links when this ships on vexoai.com itself.
*/
export const SITE = 'https://www.vexoai.com'

export const LINKS = {
  home: `${SITE}/`,
  buy: `${SITE}/checkout`,
  finish: (id) => `${SITE}/checkout?finish=${id}`,
  privacy: `${SITE}/privacy`,
  terms: `${SITE}/terms`,
  yc: 'https://www.ycombinator.com/companies/vexo',
  email: 'mailto:info@vexoai.com',
  instagram: 'https://www.instagram.com/vexoring.ai/',
  x: 'https://x.com/VexoRing',
  linkedin: 'https://www.linkedin.com/company/vexoaiinc/',
}

export const PRICE = '$199'

// The three finishes on /checkout, and how the site describes them.
export const FINISHES = [
  { id: 'graphite', label: 'Graphite', swatch: '#2c2f33', note: 'Charcoal weave. Dark titanium.' },
  { id: 'pearl', label: 'Pearl', swatch: '#d9d5cb' },
  { id: 'moss', label: 'Moss', swatch: '#5d6a4f' },
]

// Official photography and renders from vexoai.com (copied to public/images/band).
const img = (f) => `images/band/${f}`
export const PHOTOS = {
  graphiteWrist: { src: img('graphite-on-wrist.webp'), alt: 'Graphite Vexo Band on a wrist', w: 2000, h: 1600 },
  pearlWrist: { src: img('pearl-on-wrist.webp'), alt: 'Pearl Vexo Band on a wrist', w: 2000, h: 1600 },
  mossWrist: { src: img('moss-on-wrist.webp'), alt: 'Moss Vexo Band on a wrist', w: 2000, h: 1600 },
  graphite: { src: img('graphite-overview-upright-v10.webp'), alt: 'Graphite Vexo Band, standing', w: 1600, h: 1280 },
  pearl: { src: img('pearl-overview-upright-v10.webp'), alt: 'Pearl Vexo Band, standing', w: 1600, h: 1280 },
  moss: { src: img('moss-overview-upright-v10.webp'), alt: 'Moss Vexo Band, standing', w: 1600, h: 1280 },
  signature: { src: img('graphite-signature-v10.webp'), alt: 'The titanium loop closure of Vexo Band, engraved VEXO', w: 1600, h: 1280 },
  sensors: { src: img('graphite-sensors-v10.webp'), alt: 'The health sensor window on the inside of Vexo Band', w: 1600, h: 1280 },
  mic: { src: img('mic.webp'), alt: 'Close view of the small circular microphone port on Vexo Band', w: 3840, h: 3072 },
  intro: { src: img('intro.webp'), alt: 'Graphite Vexo Band emerging into the studio light', w: 3840, h: 3072 },
}

// "Band, in detail" (/checkout)
export const DETAILS = [
  ['Health sensing', 'Heart rate, skin temperature and motion.'],
  ['Built-in microphone', 'For the things you want to say.'],
  ['Quiet haptics', 'A gentle tap, just for you.'],
  ['Bluetooth LE', 'Connected to your phone.'],
  ['Onboard memory', 'Storage, built right in.'],
]

// Vexo Intelligence (home page)
export const AGENTS = ['Creating', 'Memory', 'Reservations', 'Uber', 'DoorDash', 'Shopping', 'Email']

// "Your world. Working together." — connectors listed on the home page: 59 in all, these marked Available.
export const CONNECTORS_AVAILABLE = ['Gmail', 'Google Calendar', 'Google Drive', 'Notion', 'GitHub', 'Render', 'Supabase']
export const CONNECTORS_SOON = ['Slack', 'Spotify', 'Linear', 'Figma', 'Asana', 'Outlook', 'WhatsApp', 'Todoist', 'Google Docs', 'Google Sheets', 'Microsoft Teams', 'Trello', 'Zoom', 'Dropbox']
export const CONNECTORS_TOTAL = 59

// The example on the home page (Vexo Intelligence demo)
export const DEMO = {
  said: 'Make me a pitch deck for a late-night coffee shop. Four slides. Keep it sharp.',
  title: 'after hours.',
  line: 'A neighborhood coffee house. After dark.',
  kicker: 'A place to stay, after the day is done.',
}

// The day, as the film tells it. What Vexo does with it is YC's own example:
// "booking the table, sending the follow-up, and ordering the groceries through the apps you already use".
export const DAY = [
  { heard: 'Let’s do dinner at 8.', memory: 'Dinner at 8', action: 'Table booked', detail: '8:00', via: 'Reservations' },
  { heard: 'Can you send Sarah the deck?', memory: 'Send Sarah the deck', action: 'Follow-up sent', detail: 'Sarah', via: 'Email' },
  { heard: 'We’re out of groceries.', memory: 'Need groceries', action: 'Groceries ordered', detail: '', via: 'DoorDash' },
]
