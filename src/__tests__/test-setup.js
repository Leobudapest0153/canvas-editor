/* eslint-env vitest, jsdom */
import { vi } from 'vitest'

// Stub vue-konva components globally
vi.mock('vue-konva', () => ({
  VueKonva: {},
  default: { install: () => {} }
}))

import { config } from '@vue/test-utils'
config.global.stubs = {
  'v-stage': { template: '<div><slot /></div>' },
  'v-layer': { template: '<div><slot /></div>', props: ['config'] },
  'v-rect': true,
  'v-circle': true,
  'v-line': true,
  'v-text': true,
  'v-group': true,
  'v-transformer': true,
  'rulers-overlay': true
}

// Polyfill ResizeObserver for jsdom
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
if (typeof globalThis !== 'undefined') {
  // @ts-ignore
  globalThis.ResizeObserver = ResizeObserver
}
