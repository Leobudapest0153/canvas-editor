import { describe, it, expect, beforeEach } from 'vitest'
import { setEdgeState, getEdgeState, resetEdgeState } from '@/inventory-smart/composables/useEdgeState'

describe('useEdgeState', () => {
  const id = 'e1'

  beforeEach(() => {
    resetEdgeState(id)
  })

  it('borra edgeX cuando se establece a null', () => {
    setEdgeState(id, { edgeX: 'min', edgeY: 'max' })
    expect(getEdgeState(id)).toEqual({ edgeX: 'min', edgeY: 'max' })

    setEdgeState(id, { edgeX: null })
    expect(getEdgeState(id)).toEqual({ edgeX: null, edgeY: 'max' })

    setEdgeState(id, { edgeY: null })
    expect(getEdgeState(id)).toEqual({ edgeX: null, edgeY: null })
  })
})
