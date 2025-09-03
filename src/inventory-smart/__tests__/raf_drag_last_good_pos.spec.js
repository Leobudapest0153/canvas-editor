import { describe, it, expect } from 'vitest'
import { setupRafDrag } from '@/inventory-smart/composables/useRafDrag'

describe('useRafDrag - lastGoodPos tracking', () => {
  it('inicializa lastGoodPos al iniciar el drag con la posición actual', () => {
    const bbox = { x: 12, y: 34, width: 50, height: 20 }
    const ctrl = setupRafDrag({
      stage: {},
      layer: { batchDraw: () => {} },
      getMovingShapeBBox: () => ({ ...bbox }),
      onValidateLight: () => {},
      onCommitEnd: () => {},
      onFrame: () => {},
      validatePosition: () => true,
      onValidPositionUpdate: () => {},
    })
    ctrl.start()
    const lgp = ctrl.getLastGoodPos()
    expect(lgp).toBeTruthy()
    expect(lgp.x).toBe(bbox.x)
    expect(lgp.y).toBe(bbox.y)
    ctrl.end(bbox)
  })
})

