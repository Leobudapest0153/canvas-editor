import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { handleCanvasHotkeys } from '../utils/canvasHotkeys'

describe('canvas hotkeys handler', () => {
  it('activates drag or edit modes with D and E', () => {
    const dragMode = ref(false)
    const toggleDragMode = vi.fn(() => { dragMode.value = !dragMode.value })
    const ctx = { dragMode, toggleDragMode, toggleSnapping: vi.fn(), toggleLock: vi.fn() }

    // Crear un mock de elemento que no sea input/textarea
    const mockTarget = document.createElement('div')

    // E activa dragMode cuando está en false
    handleCanvasHotkeys({ key: 'e', target: mockTarget }, ctx)
    expect(toggleDragMode).toHaveBeenCalledTimes(1)
    expect(dragMode.value).toBe(true)

    // D desactiva dragMode cuando está en true
    handleCanvasHotkeys({ key: 'd', target: mockTarget }, ctx)
    expect(toggleDragMode).toHaveBeenCalledTimes(2)
    expect(dragMode.value).toBe(false)
  })

  it('triggers snapping and locking shortcuts', () => {
    const dragMode = ref(true)
    const toggleDragMode = vi.fn()
    const toggleSnapping = vi.fn()
    const toggleLock = vi.fn()

    // Crear un mock de elemento que no sea input/textarea
    const mockTarget = document.createElement('div')

    handleCanvasHotkeys({ key: 's', target: mockTarget }, { dragMode, toggleDragMode, toggleSnapping, toggleLock })
    handleCanvasHotkeys({ key: 'l', target: mockTarget }, { dragMode, toggleDragMode, toggleSnapping, toggleLock })
    expect(toggleSnapping).toHaveBeenCalledTimes(1)
    expect(toggleLock).toHaveBeenCalledTimes(1)
    expect(toggleDragMode).not.toHaveBeenCalled()
  })

  it('ignores hotkeys when target is an input element', () => {
    const dragMode = ref(false)
    const toggleDragMode = vi.fn()
    const toggleSnapping = vi.fn()
    const toggleLock = vi.fn()
    const ctx = { dragMode, toggleDragMode, toggleSnapping, toggleLock }

    // Crear mock de elementos de entrada
    const inputTarget = document.createElement('input')
    const textareaTarget = document.createElement('textarea')

    handleCanvasHotkeys({ key: 'e', target: inputTarget }, ctx)
    handleCanvasHotkeys({ key: 's', target: textareaTarget }, ctx)

    expect(toggleDragMode).not.toHaveBeenCalled()
    expect(toggleSnapping).not.toHaveBeenCalled()
    expect(toggleLock).not.toHaveBeenCalled()
  })
})
