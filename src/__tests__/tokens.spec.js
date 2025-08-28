import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('tokens.css import and utility classes', () => {
  it('index.css imports tokens.css', () => {
    const indexPath = path.resolve(process.cwd(), 'src/styles/index.css')
    const indexCss = fs.readFileSync(indexPath, 'utf-8')
    expect(indexCss).toMatch(/@import ['"]\.\/tokens\.css['"];?/) // verifies explicit import
  })

  it('tokens.css exposes .ui-surface and .ui-ring (including dark variants)', () => {
    const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css')
    const tokensCss = fs.readFileSync(tokensPath, 'utf-8')
    expect(tokensCss).toMatch(/\.ui-surface\b/)
    expect(tokensCss).toMatch(/\.ui-ring\b/)
    expect(tokensCss).toMatch(/\.dark \.ui-surface/)
    expect(tokensCss).toMatch(/\.dark \.ui-ring/)
  })
})
