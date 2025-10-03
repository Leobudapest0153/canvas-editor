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

  it('switch group keeps legacy overflow-visible layout and spacing vars', () => {
    const wrapper = mountToolbar()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('rounded-[14px]')
    expect(group.classes()).toContain('overflow-visible')
    const styleStr = group.attributes('style') || ''
    expect(styleStr).toMatch(/--seg-w:\s*36px/)
    expect(styleStr).toMatch(/--seg-gap:\s*8px/)
    expect(styleStr).toMatch(/--seg-pad:\s*0px/)
  })

  it('slider vertical-centers with calc-based travel (legacy left calc)', async () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const slider = group.get('div[aria-hidden="true"]')
    expect(slider.classes()).toContain('rounded-full')
    expect(slider.classes()).toContain('top-1/2')
    expect(slider.classes()).toContain('-translate-y-1/2')
    expect(slider.classes()).toContain('left-0')
    expect(slider.classes()).toContain('h-[36px]')
    expect(slider.classes()).toContain('w-[36px]')
    expect(slider.classes()).toContain('duration-220')
    expect(slider.classes()).toContain('ease-[cubic-bezier(.25,1.1,.4,1)]')
  // legacy implementation positions via left calc
  const sliderStyle = slider.attributes('style') || ''
  expect(sliderStyle).toMatch(/left:\s*calc\(var\(--seg-index\) \* 50%\)/)
    // ring and contrast boost present
    expect(slider.classes()).toContain('ring-2')
    expect(slider.classes()).toContain('ring-white/15')
    await wrapper.setProps({ activeMode: 'edit' })
    const style2 = group.attributes('style') || ''
    expect(style2).toMatch(/--seg-index:\s*1/)
    const sliderStyle2 = slider.attributes('style') || ''
    expect(sliderStyle2).toMatch(/left:\s*calc\(var\(--seg-index\) \* 50%\)/)
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

  it('mode SVGs have off-state opacity class for affordance', () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const group = wrapper.get('[role="group"]')
    const svgs = group.findAll('svg')
    expect(svgs[0].classes()).toContain('data-[state=off]:opacity-70')
    expect(svgs[1].classes()).toContain('data-[state=off]:opacity-70')
  })

  it('does not render textual Move/Edit labels (icons only)', () => {
    const wrapper = mountToolbar({ activeMode: 'drag' })
    const texts = wrapper.findAll('div').map((n) => n.text())
    expect(texts).not.toContain('Move')
    expect(texts).not.toContain('Edit')
  })

  it('secondary buttons declare strong on-state styles', () => {
    const wrapper = mountToolbar({ activeMode: 'drag', isSnappingEnabled: true })
    const snapBtn = wrapper.get('button[aria-label="Alternar ajuste automático (S)"]')
    expect(snapBtn.classes()).toContain('data-[state=on]:bg-white/10')
    expect(snapBtn.classes()).toContain('data-[state=on]:ring-1')
    expect(snapBtn.classes()).toContain('data-[state=on]:ring-white/15')
    const snapSvg = snapBtn.get('svg')
    expect(snapSvg.classes()).toContain('data-[state=on]:text-white')
    expect(snapSvg.classes()).toContain('data-[state=off]:text-slate-300')
  })

  it('edit icon renders 18x18 and turns white when active', async () => {
    const wrapper = mountToolbar({ activeMode: 'edit' })
    const editBtn = wrapper.get('button[aria-label="Editar elementos (E)"]')
    const editSvg = editBtn.get('svg')
    expect(editSvg.classes()).toContain('h-[18px]')
    expect(editSvg.classes()).toContain('w-[18px]')
    // button becomes white on active, SVG uses fill-current
    expect(editBtn.classes()).toContain('!text-white')
  })

  it('has a slim divider between group and secondary buttons', () => {
    const wrapper = mountToolbar()
    // find a divider with width-px and aria-hidden that is not the slider
    const dividers = wrapper.findAll('div[aria-hidden="true"]')
    const hasSlimDivider = dividers.some((d) => d.classes().includes('w-px') && d.classes().includes('h-6'))
    expect(hasSlimDivider).toBe(true)
  })
})
