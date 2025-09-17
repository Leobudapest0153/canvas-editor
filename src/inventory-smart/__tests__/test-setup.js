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

// Proveer mock de servicio de toasts por defecto para pruebas
import { ToastSymbol } from '@/inventory-smart/plugins/toast'
config.global.provide = {
  ...(config.global.provide || {}),
  [ToastSymbol]: {
    toasts: { value: [] },
    show: vi.fn(),
    remove: vi.fn(),
    clearAll: vi.fn(),
    maxToasts: 5,
  },
}
