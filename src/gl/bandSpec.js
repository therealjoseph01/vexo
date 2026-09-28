import * as THREE from 'three'

/*
  Everything the film knows about the physical Vexo Band, measured from Vexo's own model
  (centimetres, before centring). Shared by the renderer and the director.
*/

// scene units per centimetre
export const SB = 0.42

export const BAND_CENTER = new THREE.Vector3(0, 1.31, 0)

export const PARTS = {
  wrap: /^Continuous wrap/,
  closure: /^(Loop closure|Closure axle)/,
  frame: /^Housing/,
  button: /^Side button/,
  module: /^Module housing/,
  insert: /^Inward-facing insert/,
  skin: /^Skin-side PCB/,
  pcb: /^Main PCB/,
  battery: /^Battery/,
  motor: /ERM motor/,
}

// exploded view: travel along the module axis (Z, cm) per unit of `explode`, in the real stack order
export const EXPLODE = { insert: 2.3, skin: 1.45, module: 0.6, pcb: -0.35, motor: -1.0, battery: -1.25, frame: -2.0, button: -2.0, closure: -2.9, wrap: 0 }
export const INTERNAL = ['skin', 'pcb', 'battery', 'motor']

// named points on the product and the part each one moves with
export const POINTS = {
  mic: [-0.715, 2.5, -2.45, 'frame'],
  button: [0.65, 2.53, -2.45, 'button'],
  sensor: [0.16, 1.31, -1.9, 'insert'],
  closure: [1.95, 1.31, -3.08, 'closure'],
  wordmark: [2.25, 1.31, -3.1, 'closure'],
  emblem: [-1.05, 1.87, -3.15, 'wrap'],
  flap: [0.3, 1.31, -3.15, 'wrap'],
  weaveL: [-3.33, 1.31, 0.2, 'wrap'],
  weaveR: [3.33, 1.31, 0.2, 'wrap'],
  weaveBack: [0, 1.31, 3.1, 'wrap'],
  pcb: [0.2, 1.45, -2.55, 'pcb'],
  battery: [-0.36, 1.45, -2.3, 'battery'],
  motor: [0.88, 0.78, -2.3, 'motor'],
  antenna: [1.15, 1.94, -2.5, 'pcb'],
  skin: [0.16, 1.31, -2.05, 'skin'],
  module: [0.16, 1.31, -2.45, 'module'],
}

// model point (cm, centred, exploded) → band space
export function pointLocal(name, explode, out) {
  const p = POINTS[name]
  if (!p) return null
  return out.set(p[0] - BAND_CENTER.x, p[1] - BAND_CENTER.y, p[2] - BAND_CENTER.z + (EXPLODE[p[3]] || 0) * explode)
}

/*
  How the band sits on a wrist (arm space: +X toward the fingers, +Y the back of the wrist):
  the loop's axis (band +Y) runs along the arm, the module (band −Z) sits on the back of the
  wrist, and band +X points across the wrist to −Z.
*/
export const WORN_BASIS = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)),
)

export const FINISH_LOOK = {
  graphite: { weave: new THREE.Color(0.027, 0.031, 0.036), tuck: new THREE.Color(0.133, 0.147, 0.162), metal: new THREE.Color(0.088, 0.098, 0.108) },
  pearl: { weave: new THREE.Color(0.62, 0.6, 0.55), tuck: new THREE.Color(0.52, 0.5, 0.46), metal: new THREE.Color(0.52, 0.54, 0.57) },
  moss: { weave: new THREE.Color(0.15, 0.19, 0.12), tuck: new THREE.Color(0.22, 0.27, 0.18), metal: new THREE.Color(0.55, 0.41, 0.22) },
}
