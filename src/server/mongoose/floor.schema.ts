type SchemaDefinitionInput = Record<string, unknown>
type SchemaOptionsInput = Record<string, unknown>

type SchemaPathValidator = {
  validator(this: FloorSchemaThis, value: number): boolean
  message: string
}

type SchemaPathLike = {
  validate(config: SchemaPathValidator): void
}

type SchemaInstanceLike = {
  path(path: string): SchemaPathLike
}

type SchemaConstructorLike = new (
  definition: SchemaDefinitionInput,
  options?: SchemaOptionsInput,
) => SchemaInstanceLike

type FloorSchemaThis = {
  get(path: 'isElastic'): boolean
}

const widthMessage = 'La anchura debe ser mayor a 0 salvo en pisos elásticos.'
const lengthMessage = 'La longitud debe ser mayor a 0 salvo en pisos elásticos.'
const heightMessage = 'La altura debe ser mayor a 0 salvo en pisos elásticos.'

const buildDefinition = (): SchemaDefinitionInput => ({
  width: {
    type: Number,
    min: [0, 'La anchura no puede ser negativa'],
    required: true,
  },
  length: {
    type: Number,
    min: [0, 'La longitud no puede ser negativa'],
    required: true,
  },
  height: {
    type: Number,
    min: [0, 'La altura no puede ser negativa'],
    required: true,
  },
  isElastic: {
    type: Boolean,
    default: false,
  },
})

const buildValidation = (schema: SchemaInstanceLike): void => {
  const isElastic = function (this: FloorSchemaThis) {
    return Boolean(this.get('isElastic'))
  }

  const validatorFactory = (message: string) => ({
    validator(this: FloorSchemaThis, value: number) {
      return isElastic.call(this) ? value >= 0 : value > 0
    },
    message,
  })

  schema.path('width').validate(validatorFactory(widthMessage))
  schema.path('length').validate(validatorFactory(lengthMessage))
  schema.path('height').validate(validatorFactory(heightMessage))
}

export const createFloorSchema = (
  SchemaCtor: SchemaConstructorLike,
  options: SchemaOptionsInput = { timestamps: true },
): SchemaInstanceLike => {
  const schema = new SchemaCtor(buildDefinition(), options)
  buildValidation(schema)
  return schema
}

type CreateFloorSchema = typeof createFloorSchema
export type FloorSchema = ReturnType<CreateFloorSchema>
