import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FloatingToolbar from '../components/FloatingToolbar.vue'

describe('FloatingToolbar UI (segmented control)', () => {
  const mountToolbar = (overrides: Record<string, any> = {}) =>
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

  it('container has inline-flex, whitespace-nowrap, rounded-[20px] and backdrop-saturate-150', () => {
    const wrapper = mountToolbar()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.classes()).toContain('inline-flex')
    expect(toolbar.classes()).toContain('whitespace-nowrap')
    expect(toolbar.classes()).toContain('rounded-[20px]')
    expect(toolbar.classes()).toContain('backdrop-saturate-150')
    // sanity: not column or fixed boxy dims
    expect(toolbar.classes()).not.toContain('flex-col')
    expect(toolbar.classes()).not.toContain('w-40')
    expect(toolbar.classes()).not.toContain('h-40')
  })

  it('group has rounded-[14px], overflow-hidden and exact padding', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
    expect(group.classes()).toContain('overflow-hidden')
    expect(group.classes()).toContain('px-[var(--seg-pad)]')
  })

  it('segmented exposes CSS vars, slider vertical-centers, and seg-index toggles calc translate', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const styleStr = group.attributes('style') || ''
    expect(styleStr).toMatch(/--seg-w:\s*36px/)
    expect(styleStr).toMatch(/--seg-gap:\s*8px/)
    expect(styleStr).toMatch(/--seg-pad:\s*2px/)
    expect(styleStr).toMatch(/--seg-index:\s*0/) // drag

    const slider = wrapper.get('.seg-slider')
    expect(slider.classes()).toContain('rounded-full')
    expect(slider.classes()).toContain('top-1/2')
    expect(slider.classes()).toContain('-translate-y-1/2')
    expect(slider.classes()).toContain('left-[var(--seg-pad)]')
    expect(slider.classes()).toContain('h-[36px]')
    expect(slider.classes()).toContain('w-[36px]')
    expect(slider.classes()).toContain('duration-220')
    expect(slider.classes()).toContain('ease-[cubic-bezier(.25,1.1,.4,1)]')
    // uses Tailwind transform var for X only (no optical offset)
    expect(slider.attributes('style')).toMatch(/--tw-translate-x:\s*calc\(var\(--seg-index\) \* \(var\(--seg-w\) \+ var\(--seg-gap\)\)\)/)

    await wrapper.setProps({ activeMode: 'edit' })
    const styleStr2 = group.attributes('style') || ''
    expect(styleStr2).toMatch(/--seg-index:\s*1/)
    // assert the expression uses: calc(36px + 8px)
    const segW = (styleStr2.match(/--seg-w:\s*([^;]+)/)?.[1] || '').trim()
    const segGap = (styleStr2.match(/--seg-gap:\s*([^;]+)/)?.[1] || '').trim()
    const exp = `calc(${segW} + ${segGap})`
    expect(exp).toBe('calc(36px + 8px)')
  })

  it('secondary buttons are 36x36 with 18px icons', () => {
    const wrapper = mountToolbar()
    const snapBtn = wrapper.get('button[aria-label="Alternar snapping"]')
    expect(snapBtn.classes()).toContain('h-[36px]')
    expect(snapBtn.classes()).toContain('w-[36px]')
    const svg = snapBtn.get('svg')
    expect(svg.classes()).toContain('h-[18px]')
    expect(svg.classes()).toContain('w-[18px]')
  })

  it('SVGs are block and align-middle (no baseline drift)', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const svgs = group.findAll('svg')
    svgs.forEach((svg) => {
      expect(svg.classes()).toContain('block')
      expect(svg.classes()).toContain('align-middle')
    })
  })

  it('active mode SVG has -ml-px micro-offset for perfect centering', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const svgsDrag = wrapper.get('[role="group"]').findAll('svg')
    const dragSvg = svgsDrag[0]
    const editSvg = svgsDrag[1]
    expect(dragSvg.classes()).toContain('-ml-px')
    expect(editSvg.classes()).not.toContain('-ml-px')

    await wrapper.setProps({ activeMode: 'edit' })
    const svgsEdit = wrapper.get('[role="group"]').findAll('svg')
    const dragSvg2 = svgsEdit[0]
    const editSvg2 = svgsEdit[1]
    expect(dragSvg2.classes()).not.toContain('-ml-px')
    expect(editSvg2.classes()).toContain('-ml-px')
  })
})
