import { layout, framePoint } from '../film/director'

/*
  Where the story's words and graphics live (world units, as screen offsets in a story frame).
  REAL WORLD on the left → VEXO (the band) → MEMORY → ACTION on the right.
  On a phone the film stacks vertically: what's heard above the band, what it became below.
*/
// [desktop x, y, mobile x, y]
const TALK = [
  [-3.5, 1.75, -0.35, 3.55],
  [-3.85, 0.15, 0.3, 3.25],
  [-3.3, -1.45, -0.2, 3.6],
]
const MEM = [
  [1.95, 1.05, 0, -1.75],
  [2.2, 0.2, 0, -2.45],
  [1.95, -0.65, 0, -3.15],
]
const ACT = [
  [3.35, 1.55, 0, -1.75],
  [3.75, 0.1, 0, -2.45],
  [3.35, -1.35, 0, -3.15],
]

const pick = (arr, i) => (layout.mobile ? [arr[i][2], arr[i][3]] : [arr[i][0], arr[i][1]])

export const talkPoint = (i, out) => {
  const [x, y] = pick(TALK, i)
  return framePoint('ctx', x, y, out)
}
export const memPoint = (i, out) => {
  const [x, y] = pick(MEM, i)
  return framePoint('ctx', x, y, out)
}
export const actPoint = (i, out) => {
  const [x, y] = pick(ACT, i)
  // on a phone the action takes the memory's place
  return framePoint(layout.mobile ? 'ctx' : 'act', x, y, out)
}
