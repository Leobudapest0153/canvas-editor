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

  it('slider rounded-full, duration-200 and moves 0 -> 48px', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const slider = wrapper.get('.seg-slider')
    expect(slider.classes()).toContain('rounded-full')
    expect(slider.classes()).toContain('duration-200')
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(0\)/)
    await wrapper.setProps({ activeMode: 'edit' })
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(48px\)/)
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
