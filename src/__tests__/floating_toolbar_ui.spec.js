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

  it('switch group is rounded-[14px] and overflow-hidden', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
    expect(group.classes()).toContain('overflow-hidden')
  })

  it('slider centered, cubic-bezier ease and translates 0px -> 44px', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const slider = group.get('div[aria-hidden="true"]')
    expect(slider.classes()).toContain('rounded-full')
    expect(slider.classes()).toContain('top-0.5')
    expect(slider.classes()).toContain('left-0.5')
    expect(slider.classes()).toContain('duration-250')
    expect(slider.classes()).toContain('ease-[cubic-bezier(.25,1.25,.5,1)]')
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(0\)/)
    await wrapper.setProps({ activeMode: 'edit' })
    expect(slider.attributes('style')).toMatch(/transform:\s*translateX\(44px\)/)
  })

  it('active icon uses text-white on its SVG', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const [dragBtn, editBtn] = group.findAll('button')
    expect(dragBtn.get('svg').classes()).toContain('text-white')
    expect(editBtn.get('svg').classes()).not.toContain('text-white')
    await wrapper.setProps({ activeMode: 'edit' })
    expect(group.findAll('button')[1].get('svg').classes()).toContain('text-white')
  })

  it('has a slim divider between group and secondary buttons', () => {
    const wrapper = mountToolbar()
    // find a divider with width-px and aria-hidden that is not the slider
    const dividers = wrapper.findAll('div[aria-hidden="true"]')
    const hasSlimDivider = dividers.some((d) => d.classes().includes('w-px') && d.classes().includes('h-6'))
    expect(hasSlimDivider).toBe(true)
  })
})
