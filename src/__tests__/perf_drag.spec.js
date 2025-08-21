import { describe, it, expect, vi } from 'vitest'
import { setupRafDrag } from '@/composables/useRafDrag'

describe('useRafDrag perf cadence', () => {
  it('validates at most ~every other frame and no commits on move', () => {
    let validateCalls = 0
    const calls = []

    // Fake stage/layer
    const layer = { batchDraw: vi.fn() }
    const stage = {}

    // Mutable bbox
    const bbox = { x: 0, y: 0, width: 50, height: 40 }
    const getMovingShapeBBox = () => ({ ...bbox })

    const onValidateLight = () => {
      validateCalls++
    }
    const onCommitEnd = (finalBBox) => calls.push(['commit', finalBBox])

    const ctrl = setupRafDrag({ stage, layer, getMovingShapeBBox, onValidateLight, onCommitEnd })

    // rAF stub simulating ~120ms worth of frames at 16ms step
    let cb
    vi.stubGlobal('requestAnimationFrame', (fn) => {
      cb = fn
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})

    ctrl.start()

    // simulate motion across ~8 frames
    const times = [0, 16, 32, 48, 64, 80, 96, 112]
    times.forEach((t, i) => {
      bbox.x = i * 2
      ctrl.move({ x: bbox.x, y: bbox.y })
      cb && cb(t)
    })

    // Expect ≤ 8 light validations; with throttle(2) usually ~4
    expect(validateCalls).toBeLessThanOrEqual(8)

    // Moves should not trigger commits
    expect(calls.length).toBe(0)

    // End once -> a single commit
    ctrl.end({ ...bbox })
    expect(calls.length).toBe(1)
  })
})

