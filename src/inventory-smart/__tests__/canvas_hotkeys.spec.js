import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { handleCanvasHotkeys } from '../utils/canvasHotkeys'

describe('canvas hotkeys handler', () => {
  it('activates drag or edit modes with D and E', () => {
    const dragMode = ref(false)
    const toggleDragMode = vi.fn(() => { dragMode.value = !dragMode.value })
    const ctx = { dragMode, toggleDragMode, toggleSnapping: vi.fn(), toggleLock: vi.fn() }
    handleCanvasHotkeys({ key: 'd' }, ctx)
    expect(toggleDragMode).toHaveBeenCalledTimes(1)
    dragMode.value = true
    handleCanvasHotkeys({ key: 'e' }, ctx)
    expect(toggleDragMode).toHaveBeenCalledTimes(2)
  })

  it('triggers snapping and locking shortcuts', () => {
    const dragMode = ref(true)
    const toggleDragMode = vi.fn()
    const toggleSnapping = vi.fn()
    const toggleLock = vi.fn()
    handleCanvasHotkeys({ key: 's' }, { dragMode, toggleDragMode, toggleSnapping, toggleLock })
    handleCanvasHotkeys({ key: 'l' }, { dragMode, toggleDragMode, toggleSnapping, toggleLock })
    expect(toggleSnapping).toHaveBeenCalledTimes(1)
    expect(toggleLock).toHaveBeenCalledTimes(1)
    expect(toggleDragMode).not.toHaveBeenCalled()
  })
})
