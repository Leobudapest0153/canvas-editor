import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FloatingToolbar from '../components/FloatingToolbar.vue'

describe('FloatingToolbar UI', () => {
  const mountToolbar = (overrides = {}) =>
    mount(FloatingToolbar, {
      props: {
        activeMode: 'drag',
        isElementSelected: true,
        isElementLocked: false,
        isContainer: true,
        isSnappingEnabled: true,
        ...overrides,
      },
    })

  it('renders container as toolbar with aria-label and ui-surface', () => {
    const wrapper = mountToolbar()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.attributes('aria-label')).toBe('Toolbar de lienzo')
    expect(toolbar.classes()).toContain('ui-surface')
    expect(toolbar.classes()).toContain('fixed')
    expect(toolbar.classes()).toContain('bottom-5')
    expect(toolbar.classes()).toContain('left-1/2')
    expect(toolbar.classes()).toContain('-translate-x-1/2')
    expect(toolbar.classes()).toContain('z-30')
  })

  it('has square buttons with var(--btn-size) and aria-labels', () => {
    const wrapper = mountToolbar()
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    // Every visible button uses the sizing utilities
    buttons.forEach((btn) => {
      const classes = btn.classes()
      expect(classes).toContain('h-[var(--btn-size)]')
      expect(classes).toContain('w-[var(--btn-size)]')
      expect(btn.attributes('aria-label')).toBeTruthy()
    })
  })

  it('puts active button above slider and icon is white', () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const toggleButtons = group.findAll('button')
    // First button corresponds to 'drag'
    const activeBtn = toggleButtons[0]
    expect(activeBtn.classes()).toContain('z-10')
    const svg = activeBtn.get('svg')
    // Icon should be forced white
    expect(svg.classes().some((c) => c === 'text-white' || c === '!text-white')).toBe(true)
  })
})
