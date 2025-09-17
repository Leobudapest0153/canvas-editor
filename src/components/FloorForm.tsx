import { computed, defineComponent, h, reactive, watch } from 'vue'
import type { PropType } from 'vue'

export type FloorFormValues = {
  width: number
  length: number
  height: number
  isElastic: boolean
}

type ErrorBag = {
  width: string
  length: string
  height: string
}

const createInitialState = (values?: Partial<FloorFormValues>): FloorFormValues => ({
  width: Number(values?.width ?? 0),
  length: Number(values?.length ?? 0),
  height: Number(values?.height ?? 0),
  isElastic: Boolean(values?.isElastic),
})

const createEmptyErrors = (): ErrorBag => ({ width: '', length: '', height: '' })

export default defineComponent({
  name: 'FloorForm',
  props: {
    initialValues: {
      type: Object as PropType<Partial<FloorFormValues>>,
      default: () => ({}) as Partial<FloorFormValues>,
    },
  },
  emits: ['submit'],
  setup(props, { emit }) {
    const state = reactive(createInitialState(props.initialValues))
    const errors = reactive(createEmptyErrors())

    const disableDimensions = computed(() => state.isElastic)

    const syncFromProps = (values?: Partial<FloorFormValues>) => {
      const next = createInitialState(values)
      state.width = next.width
      state.length = next.length
      state.height = next.height
      state.isElastic = next.isElastic
    }

    watch(
      () => props.initialValues,
      (next) => {
        syncFromProps(next)
        Object.assign(errors, createEmptyErrors())
      },
      { deep: true },
    )

    const clearErrors = () => {
      Object.assign(errors, createEmptyErrors())
    }

    const parseNumber = (value: string): number => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const validate = (): ErrorBag => {
      const result = createEmptyErrors()
      const checks: Array<[keyof ErrorBag, number]> = [
        ['width', state.width],
        ['length', state.length],
        ['height', state.height],
      ]

      for (const [field, value] of checks) {
        if (state.isElastic) {
          if (value < 0) {
            result[field] = 'No puede ser negativo'
          }
        } else if (value <= 0) {
          result[field] = 'Debe ser mayor a 0'
        }
      }

      return result
    }

    const handleSubmit = (event: Event) => {
      event.preventDefault()
      const validation = validate()
      Object.assign(errors, validation)

      const hasErrors = Object.values(validation).some((message) => message)
      if (!hasErrors) {
        emit('submit', { ...state })
      }
    }

    const handleInput = (field: keyof FloorFormValues, event: Event) => {
      const target = event.target as HTMLInputElement | null
      if (!target) return
      const value = parseNumber(target.value)
      state[field] = value
    }

    const handleElasticToggle = (event: Event) => {
      const target = event.target as HTMLInputElement | null
      if (!target) return
      state.isElastic = target.checked
      if (state.isElastic) {
        clearErrors()
      }
    }

    return () =>
      h(
        'form',
        {
          class: 'floor-form',
          onSubmit: handleSubmit,
        },
        [
          h('div', { class: 'field' }, [
            h('label', { for: 'floor-width' }, 'Ancho (cm)'),
            h('input', {
              id: 'floor-width',
              name: 'width',
              type: 'number',
              min: '0',
              value: state.width,
              disabled: disableDimensions.value,
              onInput: (event: Event) => handleInput('width', event),
            }),
            errors.width
              ? h(
                  'p',
                  { class: 'error', 'data-error': 'width', role: 'alert' },
                  errors.width,
                )
              : null,
          ]),
          h('div', { class: 'field' }, [
            h('label', { for: 'floor-length' }, 'Largo (cm)'),
            h('input', {
              id: 'floor-length',
              name: 'length',
              type: 'number',
              min: '0',
              value: state.length,
              disabled: disableDimensions.value,
              onInput: (event: Event) => handleInput('length', event),
            }),
            errors.length
              ? h(
                  'p',
                  { class: 'error', 'data-error': 'length', role: 'alert' },
                  errors.length,
                )
              : null,
          ]),
          h('div', { class: 'field' }, [
            h('label', { for: 'floor-height' }, 'Alto (cm)'),
            h('input', {
              id: 'floor-height',
              name: 'height',
              type: 'number',
              min: '0',
              value: state.height,
              disabled: disableDimensions.value,
              onInput: (event: Event) => handleInput('height', event),
            }),
            errors.height
              ? h(
                  'p',
                  { class: 'error', 'data-error': 'height', role: 'alert' },
                  errors.height,
                )
              : null,
          ]),
          h('div', { class: 'field' }, [
            h(
              'label',
              { class: 'checkbox', for: 'floor-isElastic' },
              [
                h('input', {
                  id: 'floor-isElastic',
                  type: 'checkbox',
                  name: 'isElastic',
                  checked: state.isElastic,
                  onChange: handleElasticToggle,
                }),
                h('span', null, 'Piso elástico'),
              ],
            ),
          ]),
          h('button', { type: 'submit' }, 'Guardar piso'),
        ],
      )
  },
})
