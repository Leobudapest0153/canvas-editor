import { describe, expect, it } from 'vitest'

import { FloorForm, validateFloorDimensions } from '@/components/FloorForm'
import type { FloorFormValues } from '@/components/FloorForm'
import { findElement } from './mini-react-helpers'

function createValues(overrides: Partial<FloorFormValues> = {}): FloorFormValues {
  return {
    width: 10,
    length: 10,
    height: 10,
    isElastic: false,
    ...overrides,
  }
}

function findInput(root: ReturnType<typeof FloorForm>, name: string) {
  const node = findElement(root, (element) => element.type === 'input' && element.props.name === name)
  if (!node) {
    throw new Error(`Input with name "${name}" not found`)
  }
  return node
}

describe('FloorForm', () => {
  it('disables dimension fields when the floor is elastic', () => {
    const values = createValues({ isElastic: true })
    const tree = FloorForm({ value: values, onChange: () => {}, showErrors: true })

    const width = findInput(tree, 'width')
    const length = findInput(tree, 'length')
    const height = findInput(tree, 'height')

    expect(width.props.disabled).toBe(true)
    expect(length.props.disabled).toBe(true)
    expect(height.props.disabled).toBe(true)
  })

  it('skips greater-than-zero validation when elastic is enabled', () => {
    const nonElasticValues = createValues({ width: 0, length: 0, height: 0, isElastic: false })
    const nonElasticTree = FloorForm({ value: nonElasticValues, onChange: () => {}, showErrors: true })

    expect(findInput(nonElasticTree, 'width').props['data-error']).toContain('greater than 0')
    expect(findInput(nonElasticTree, 'length').props['data-error']).toContain('greater than 0')
    expect(findInput(nonElasticTree, 'height').props['data-error']).toContain('greater than 0')

    const elasticValues = { ...nonElasticValues, isElastic: true }
    const elasticTree = FloorForm({ value: elasticValues, onChange: () => {}, showErrors: true })

    expect(findInput(elasticTree, 'width').props['data-error']).toBe('')
    expect(findInput(elasticTree, 'length').props['data-error']).toBe('')
    expect(findInput(elasticTree, 'height').props['data-error']).toBe('')

    expect(validateFloorDimensions(elasticValues)).toEqual({})
  })
})
