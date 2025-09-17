import type { MiniReactElement } from '@/lib/mini-react/jsx-runtime'

type DimensionKey = 'width' | 'length' | 'height'

export interface FloorFormValues {
  width: number
  length: number
  height: number
  isElastic: boolean
}

export type FloorFieldErrors = Partial<Record<DimensionKey, string>>

export interface FloorFormProps {
  value: FloorFormValues
  onChange: (next: FloorFormValues) => void
  showErrors?: boolean
}

type NumericInputChangeEvent = {
  currentTarget: {
    value: string
  }
}

type CheckboxChangeEvent = {
  currentTarget: {
    checked: boolean
  }
}

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  width: 'Width',
  length: 'Length',
  height: 'Height',
}

export function validateFloorDimensions(values: FloorFormValues): FloorFieldErrors {
  if (values.isElastic) {
    return {}
  }

  const errors: FloorFieldErrors = {}
  for (const dimension of ['width', 'length', 'height'] as DimensionKey[]) {
    if (values[dimension] <= 0) {
      errors[dimension] = `${DIMENSION_LABELS[dimension]} must be greater than 0`
    }
  }
  return errors
}

function parseNumericValue(input: string): number {
  const numeric = Number.parseFloat(input)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return numeric
}

export function FloorForm({ value, onChange, showErrors = false }: FloorFormProps): MiniReactElement {
  const errors = validateFloorDimensions(value)

  const handleDimensionChange = (dimension: DimensionKey) => (event: NumericInputChangeEvent) => {
    const nextValue = parseNumericValue(event.currentTarget.value)
    onChange({ ...value, [dimension]: nextValue })
  }

  const handleElasticToggle = (event: CheckboxChangeEvent) => {
    const nextElastic = event.currentTarget.checked
    const nextValues: FloorFormValues = {
      ...value,
      isElastic: nextElastic,
    }

    if (nextElastic) {
      nextValues.width = Math.max(0, value.width)
      nextValues.length = Math.max(0, value.length)
      nextValues.height = Math.max(0, value.height)
    }

    onChange(nextValues)
  }

  const renderDimensionInput = (dimension: DimensionKey): MiniReactElement => {
    const dimensionError = errors[dimension]
    const invalid = showErrors && Boolean(dimensionError)

    return (
      <label className={`floor-dimension field-${dimension}`}>
        <span>{DIMENSION_LABELS[dimension]}</span>
        <input
          type="number"
          name={dimension}
          value={value[dimension]}
          disabled={value.isElastic}
          min={value.isElastic ? undefined : 0}
          aria-invalid={invalid ? 'true' : undefined}
          data-error={dimensionError ?? ''}
          onChange={handleDimensionChange(dimension)}
        />
      </label>
    )
  }

  return (
    <>
      <label className="floor-flag field-elastic">
        <input type="checkbox" name="isElastic" checked={value.isElastic} onChange={handleElasticToggle} />
        <span>isElastic</span>
      </label>
      <div className="floor-dimensions" data-elastic={value.isElastic ? 'true' : 'false'}>
        {(['width', 'length', 'height'] as DimensionKey[]).map((dimension) => (
          <div className="dimension-field" data-dimension={dimension} key={dimension}>
            {renderDimensionInput(dimension)}
          </div>
        ))}
      </div>
    </>
  )
}
