/*
 * Migration to introduce the elastic floor flag and relaxed dimension checks.
 * The implementation mirrors a TypeORM MigrationInterface without importing the
 * full dependency (kept lightweight for the snippet catalog).
 */

export type QueryRunnerLike = { query: (sql: string) => Promise<unknown> }

export class AddElasticToFloor1710000000000 /* implements MigrationInterface */ {
  public async up(queryRunner: QueryRunnerLike): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "floors" ADD COLUMN IF NOT EXISTS "isElastic" boolean NOT NULL DEFAULT false',
    )

    await queryRunner.query(
      'ALTER TABLE "floors" DROP CONSTRAINT IF EXISTS "CHK_floors_positive_dimensions"',
    )

    await queryRunner.query(
      [
        'ALTER TABLE "floors" ADD CONSTRAINT "CHK_floors_positive_dimensions"',
        'CHECK (',
        '  CASE',
        '    WHEN "isElastic" THEN',
        '      "width" >= 0 AND "length" >= 0 AND "height" >= 0',
        '    ELSE',
        '      "width" > 0 AND "length" > 0 AND "height" > 0',
        '  END',
        ')',
      ].join(' '),
    )
  }

  public async down(queryRunner: QueryRunnerLike): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "floors" DROP CONSTRAINT IF EXISTS "CHK_floors_positive_dimensions"',
    )

    await queryRunner.query('ALTER TABLE "floors" DROP COLUMN IF EXISTS "isElastic"')

    await queryRunner.query(
      [
        'ALTER TABLE "floors" ADD CONSTRAINT "CHK_floors_positive_dimensions"',
        'CHECK ("width" > 0 AND "length" > 0 AND "height" > 0)',
      ].join(' '),
    )
  }
}
