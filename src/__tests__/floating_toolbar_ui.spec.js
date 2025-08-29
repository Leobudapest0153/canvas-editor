import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FloatingToolbar from '../components/FloatingToolbar.vue'

describe('FloatingToolbar UI (refactor visuals)', () => {
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

  it('container has rounded-[20px], backdrop-blur-xl and backdrop-saturate-150', () => {
    const wrapper = mountToolbar()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.classes()).toContain('rounded-[20px]')
    expect(toolbar.classes()).toContain('backdrop-blur-xl')
    expect(toolbar.classes()).toContain('backdrop-saturate-150')
  })

  it('switch group is rounded-[14px], overflow-hidden, and exact paddings/vars', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
    expect(group.classes()).toContain('overflow-hidden')
    expect(group.classes()).toContain('px-0.5')
    expect(group.classes()).toContain('py-0.5')
    const styleStr = group.attributes('style') || ''
    expect(styleStr).toMatch(/--seg-w:\s*36px/)
    expect(styleStr).toMatch(/--seg-gap:\s*8px/)
    expect(styleStr).toMatch(/--seg-pad:\s*2px/)
  })

  it('slider vertical-centers with calc-based travel', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const slider = group.get('div[aria-hidden="true"]')
    expect(slider.classes()).toContain('rounded-full')
    expect(slider.classes()).toContain('top-1/2')
    expect(slider.classes()).toContain('-translate-y-1/2')
    expect(slider.classes()).toContain('duration-220')
    expect(slider.classes()).toContain('ease-[cubic-bezier(.25,1.1,.4,1)]')
    expect(slider.classes()).toContain('left-[var(--seg-pad,2px)]')
    // uses CSS vars with calc
    expect(slider.attributes('style')).toMatch(/translateX\(calc\(var\(--seg-index\) \* \(var\(--seg-w\) \+ var\(--seg-gap\)\)\)\)/)
    await wrapper.setProps({ activeMode: 'edit' })
    const style2 = group.attributes('style') || ''
    expect(style2).toMatch(/--seg-index:\s*1/)
    expect(slider.attributes('style')).toMatch(/translateX\(calc\(36px \+ 8px\)\)/)
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

  it('has a slim divider between group and secondary buttons', () => {
    const wrapper = mountToolbar()
    // find a divider with width-px and aria-hidden that is not the slider
    const dividers = wrapper.findAll('div[aria-hidden="true"]')
    const hasSlimDivider = dividers.some((d) => d.classes().includes('w-px') && d.classes().includes('h-6'))
    expect(hasSlimDivider).toBe(true)
  })
})
