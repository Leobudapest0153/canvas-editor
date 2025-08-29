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

  it('group has rounded-[14px] and overflow-hidden', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
    expect(group.classes()).toContain('overflow-hidden')
  })

  it('segmented exposes CSS vars, slider vertical-centers, and seg-index toggles calc translate', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const styleStr = group.attributes('style') || ''
    expect(styleStr).toMatch(/--seg-w:\s*36px/)
    expect(styleStr).toMatch(/--seg-gap:\s*8px/)
    expect(styleStr).toMatch(/--seg-index:\s*0/) // drag

    const slider = wrapper.get('.seg-slider')
    expect(slider.classes()).toContain('rounded-full')
    expect(slider.classes()).toContain('top-1/2')
    expect(slider.classes()).toContain('-translate-y-1/2')
    expect(slider.classes()).toContain('duration-220')
    expect(slider.classes()).toContain('ease-[cubic-bezier(.25,1.25,.5,1)]')
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(calc\(var\(--seg-index\) \* \(var\(--seg-w\) \+ var\(--seg-gap\)\)\)\)/)

    await wrapper.setProps({ activeMode: 'edit' })
    const styleStr2 = group.attributes('style') || ''
    expect(styleStr2).toMatch(/--seg-index:\s*1/)
    // effective travel equals calc(36px + 8px)
    expect(slider.attributes('style')).toMatch(/translateX\(calc\(var\(--seg-index\) \* \(var\(--seg-w\) \+ var\(--seg-gap\)\)\)\)/)
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

  it('active button icon has text-white', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const [dragBtn, editBtn] = group.findAll('button')
    expect(dragBtn.get('svg').classes()).toContain('text-white')
    expect(editBtn.get('svg').classes()).not.toContain('text-white')
    await wrapper.setProps({ activeMode: 'edit' })
    const [, editBtn2] = group.findAll('button')
    expect(editBtn2.get('svg').classes()).toContain('text-white')
  })
})
