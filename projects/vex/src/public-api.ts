/*
 * Public API Surface of vex
 */
export {
  VexInterface as Vex, // Forbid consumers from constructing a `Vex` with `new`.
  VexOptions,
  createVexForRoot,
  createVexForFeature
} from './lib/vex'
export * from './lib/vex.module'
