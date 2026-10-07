/**
 * Shared loader for spec files.
 * Imports app source so specs never restate geometry data.
 */
export { describe, it, expect, xit } from '../harness/spec.mjs'