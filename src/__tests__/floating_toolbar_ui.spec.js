import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import fs from 'node:fs'
import path from 'node:path'
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
        isSnapping: false,
        avoidOverlap: false,
        ...overrides,
      },
    })

  it('renders container as toolbar with aria-label and ui-surface', () => {
    const wrapper = mountToolbar()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.attributes('aria-label')).toBe('Toolbar de lienzo')
    expect(toolbar.classes()).toContain('ui-surface')
    expect(toolbar.classes()).toContain('fixed')
      expect(toolbar.classes()).toContain('bottom-[max(1.25rem,env(safe-area-inset-bottom))]')
      expect(toolbar.classes()).toContain('sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]')
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

  it('applies vertical offset when avoidOverlap is true', async () => {
    const wrapper = mountToolbar()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.classes()).not.toContain('translate-y-20')
    await wrapper.setProps({ avoidOverlap: true })
    expect(toolbar.classes()).toContain('translate-y-20')
  })

  it('marks toggle buttons with aria-pressed according to state', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    const [dragBtn, editBtn] = group.findAll('button')
    expect(dragBtn.attributes('aria-pressed')).toBe('true')
    expect(editBtn.attributes('aria-pressed')).toBe('false')
    const snapBtn = wrapper.get('button[aria-label="Alternar snapping"]')
    expect(snapBtn.attributes('aria-pressed')).toBe('true')
    const lockBtn = wrapper.get('button[aria-label="Bloquear elemento"]')
    expect(lockBtn.attributes('aria-pressed')).toBe('false')
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
            c.startsWith('disabled:') ||
            c === 'relative' ||
            c === 'z-10' ||
            c === '!text-white' ||
            c === 'text-slate-200' ||
            c === 'hover:bg-black/5' ||
            c === 'dark:hover:bg-white/5',
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
        "dark:hover:bg-white/5",
        "disabled:opacity-45",
        "disabled:pointer-events-none",
        "disabled:saturate-75",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "hover:bg-black/5",
        "relative",
        "text-slate-200",
        "z-10",
      ]
    `)

    expect(extract(editBtn).state).toBe('off')
    expect(extract(editBtn).classes).toMatchInlineSnapshot(`
      [
        "[data-state=off]:hover:bg-black/5",
        "[data-state=on]:hover:opacity-95",
        "dark:[data-state=off]:hover:bg-white/5",
        "dark:hover:bg-white/5",
        "disabled:opacity-45",
        "disabled:pointer-events-none",
        "disabled:saturate-75",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "hover:bg-black/5",
        "relative",
        "text-slate-200",
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
        "dark:hover:bg-white/5",
        "disabled:opacity-45",
        "disabled:pointer-events-none",
        "disabled:saturate-75",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "hover:bg-black/5",
        "relative",
        "text-slate-200",
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
        "dark:hover:bg-white/5",
        "disabled:opacity-45",
        "disabled:pointer-events-none",
        "disabled:saturate-75",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--primary)]/40",
        "hover:bg-black/5",
        "relative",
        "text-slate-200",
        "z-10",
      ]
    `)
  })

  it('shows snapping indicator when snapping is active', () => {
    const wrapper = mountToolbar({ isSnappingEnabled: true, isSnapping: true })
    const snapBtn = wrapper.get('button[aria-label="Alternar snapping"]')
    const badge = snapBtn.get('span')
    expect(badge.classes().sort()).toMatchInlineSnapshot(`
      [
        "absolute",
        "animate-pulse",
        "bg-[var(--primary)]",
        "h-2",
        "right-1",
        "rounded-full",
        "top-1",
        "w-2",
      ]
    `)
  })

  it('applies amber styling and locked icon when element locked', () => {
    const wrapper = mountToolbar({ isElementLocked: true })
    const lockBtn = wrapper.get('button[aria-label="Desbloquear elemento"]')
    expect(
      lockBtn
        .classes()
        .filter((c) => c === 'text-amber-600' || c === 'dark:text-amber-400')
        .sort(),
    ).toMatchInlineSnapshot(`
      [
        "dark:text-amber-400",
        "text-amber-600",
      ]
    `)
    // ensure locked icon rendered
    expect(lockBtn.findAll('svg').length).toBe(1)
  })

  it('buttons expose disabled opacity and saturation variants', () => {
    const wrapper = mountToolbar()
    const btn = wrapper.get('button')
    expect(
      btn
        .classes()
        .filter((c) => c.startsWith('disabled:'))
        .sort(),
    ).toMatchInlineSnapshot(`
      [
        "disabled:opacity-45",
        "disabled:pointer-events-none",
        "disabled:saturate-75",
      ]
    `)
  })

  it('applies dark ui-surface styles when root has class dark', () => {
    const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css')
    const tokensCss = fs.readFileSync(tokensPath, 'utf-8')
    const style = document.createElement('style')
    style.textContent = tokensCss
    document.head.appendChild(style)

    document.documentElement.classList.add('dark')
    const wrapper = mountToolbar()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.classes()).toContain('ui-surface')
    const rootStyles = getComputedStyle(document.documentElement)
    expect(rootStyles.getPropertyValue('--ui-bg-dark').trim()).toBe('rgba(15, 17, 20, 0.92)')
    expect(rootStyles.getPropertyValue('--ui-border-dark').trim()).toBe('rgba(255, 255, 255, 0.06)')

    document.documentElement.classList.remove('dark')
    style.remove()
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
