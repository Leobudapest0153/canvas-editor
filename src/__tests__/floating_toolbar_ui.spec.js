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

  it('exposes data-state hover variants and snapshots classes in both states', async () => {
    const extract = (btn) => ({
      state: btn.attributes('data-state'),
      classes: btn
        .attributes('class')
        .split(/\s+/)
        .filter(
          (c) =>
            c.startsWith('[data-state') ||
            c.startsWith('dark:[data-state') ||
            c.startsWith('focus-visible') ||
            c === 'relative' ||
            c === 'z-10' ||
            c === '!text-white',
        )
        .sort(),
    })

    const wrapper = mountToolbar({ activeMode: 'drag', isSnappingEnabled: true })
    const group = wrapper.get('[role="group"]')
    let [dragBtn, editBtn] = group.findAll('button')

    expect(extract(dragBtn).state).toBe('on')
    expect(extract(dragBtn).classes).toMatchInlineSnapshot(`
      [
        "!text-white",
        "[data-state=off]:hover:bg-black/5",
        "[data-state=on]:hover:opacity-95",
        "dark:[data-state=off]:hover:bg-white/5",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "relative",
        "z-10",
      ]
    `)

    expect(extract(editBtn).state).toBe('off')
    expect(extract(editBtn).classes).toMatchInlineSnapshot(`
      [
        "[data-state=off]:hover:bg-black/5",
        "[data-state=on]:hover:opacity-95",
        "dark:[data-state=off]:hover:bg-white/5",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "relative",
        "z-10",
      ]
    `)

    // Switch to edit mode
    await wrapper.setProps({ activeMode: 'edit' })
    ;[dragBtn, editBtn] = group.findAll('button')

    expect(extract(dragBtn).state).toBe('off')
    expect(extract(dragBtn).classes).toMatchInlineSnapshot(`
      [
        "[data-state=off]:hover:bg-black/5",
        "[data-state=on]:hover:opacity-95",
        "dark:[data-state=off]:hover:bg-white/5",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "relative",
        "z-10",
      ]
    `)

    expect(extract(editBtn).state).toBe('on')
    expect(extract(editBtn).classes).toMatchInlineSnapshot(`
      [
        "!text-white",
        "[data-state=off]:hover:bg-black/5",
        "[data-state=on]:hover:opacity-95",
        "dark:[data-state=off]:hover:bg-white/5",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "relative",
        "z-10",
      ]
    `)
  })

  it('switch pill has rounded/padding/gap and indicator moves correctly', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
    expect(group.classes()).toContain('p-[6px]')
    expect(group.classes()).toContain('gap-[6px]')

    const indicator = group.find('div[aria-hidden="true"]')
    // Initial position for drag mode
    expect(indicator.attributes('style')).toMatch(/transform:\s*translateX\(0%\)/)

    // Switch to edit mode and check transform includes button width + gap
    await wrapper.setProps({ activeMode: 'edit' })
    expect(indicator.attributes('style')).toMatch(/transform:\s*translateX\(calc\(var\(--btn-size\) \+ 6px\)\)/)
    // Transition easing and duration should be present via classes
    expect(indicator.classes()).toContain('duration-200')
    expect(indicator.classes()).toContain('ease-out')
  })
})
