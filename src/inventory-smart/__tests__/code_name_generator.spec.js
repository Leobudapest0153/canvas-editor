import { describe, it, expect } from 'vitest'
import { generateCodigo, generateNombre, nextAlpha } from '@/inventory-smart/utils/codeNameGenerator.js'

describe('codeNameGenerator', () => {
  it('nextAlpha avanza A->B, Z->AA, AZ->BA', () => {
    expect(nextAlpha()).toBe('A')
    expect(nextAlpha('A')).toBe('B')
    expect(nextAlpha('Z')).toBe('AA')
    expect(nextAlpha('AZ')).toBe('BA')
  })

  it('pasillos: nombre alfabético incremental basado en último', () => {
    const existing = []
    // primero
    const n1 = generateNombre('pasillos', { existing })
    expect(n1).toBe('Pasillos 1')
    existing.push({ tipo: 'pasillos', nombre: n1 })
    // segundo
    const n2 = generateNombre('pasillos', { existing })
    expect(n2).toBe('Pasillos 2')
  })

  it('pasillos: codigo usa solo letras alfabéticas', () => {
    const existing = []
    const c1 = generateCodigo('pasillos', { existing })
    expect(c1).toBe('A')
    existing.push({ tipo: 'pasillos', codigo: c1 })
    const c2 = generateCodigo('pasillos', { existing })
    expect(c2).toBe('B')
  })

  it('pasillos: secuencia completa A-Z-AA-AB', () => {
    const existing = []

    // Crear 26 pasillos (A-Z)
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode('A'.charCodeAt(0) + i)
      existing.push({ tipo: 'pasillos', codigo: letter })
    }

    // El siguiente debería ser AA
    const nextCode = generateCodigo('pasillos', { existing })
    expect(nextCode).toBe('AA')

    existing.push({ tipo: 'pasillos', codigo: nextCode })

    // El siguiente debería ser AB
    const nextCode2 = generateCodigo('pasillos', { existing })
    expect(nextCode2).toBe('AB')
  })

  it('otros tipos: codigo PREFIX-### incremental', () => {
    const existing = [{ tipo: 'elementos', codigo: 'ELM-001' }]
    const c = generateCodigo('elementos', { existing })
    expect(c).toBe('ELM-002')
    const n = generateNombre('elementos', { existing, baseName: undefined })
    expect(n).toMatch(/^Elementos\s+\d+$/)
  })
})
