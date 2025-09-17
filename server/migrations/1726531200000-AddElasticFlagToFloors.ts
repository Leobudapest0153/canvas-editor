const FLOOR_TABLE = 'floors'
const DIMENSION_CONSTRAINT = 'CHK_floors_dimensions_positive'

type QueryRunnerLike = {
  query: (sql: string) => Promise<unknown>
}

type TableIdentifier = string | { schema?: string; tableName: string }

function tableName(input: TableIdentifier): string {
  if (typeof input === 'string') {
    return `"${input}"`
  }
  const schema = input.schema ? `"${input.schema}".` : ''
  return `${schema}"${input.tableName}"`
}

export class AddElasticFlagToFloors1726531200000 {
  readonly name = 'AddElasticFlagToFloors1726531200000'

  async up(queryRunner: QueryRunnerLike, table: TableIdentifier = FLOOR_TABLE): Promise<void> {
    const tableRef = tableName(table)
    await queryRunner.query(`ALTER TABLE ${tableRef} ADD COLUMN IF NOT EXISTS "isElastic" boolean NOT NULL DEFAULT false`)
    await queryRunner.query(`ALTER TABLE ${tableRef} DROP CONSTRAINT IF EXISTS ${DIMENSION_CONSTRAINT}`)
    await queryRunner.query(`ALTER TABLE ${tableRef}
      ADD CONSTRAINT ${DIMENSION_CONSTRAINT}
      CHECK (
        ("isElastic" = true AND "width" >= 0 AND "length" >= 0 AND "height" >= 0)
        OR
        ("isElastic" = false AND "width" > 0 AND "length" > 0 AND "height" > 0)
      )`)
  }

  async down(queryRunner: QueryRunnerLike, table: TableIdentifier = FLOOR_TABLE): Promise<void> {
    const tableRef = tableName(table)
    await queryRunner.query(`ALTER TABLE ${tableRef} DROP CONSTRAINT IF EXISTS ${DIMENSION_CONSTRAINT}`)
    await queryRunner.query(`ALTER TABLE ${tableRef} DROP COLUMN IF EXISTS "isElastic"`)
  }
}
