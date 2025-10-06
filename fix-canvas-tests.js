const fs = require('fs')
const path = require('path')

const testsToFix = [
  'src/inventory-smart/__tests__/layer-order.spec.js',
  'src/inventory-smart/__tests__/drop-outside-polygon.spec.js',
  'src/inventory-smart/__tests__/z-stacking-integration.spec.js',
  'src/inventory-smart/__tests__/coplanar-clamp-integration.spec.js'
]

const mockPlacementSuggestionsCode = `
// Mock del sistema de sugerencias
const mockPlacementSuggestions = {
  tryPlaceWithSuggestions: vi.fn(() => Promise.resolve(true)),
  generatePlacementSuggestions: vi.fn(() => null),
  applySuggestedAdjustments: vi.fn((el) => el)
}`

const provideCode = `{
      global: {
        provide: {
          placementSuggestions: mockPlacementSuggestions
        }
      }
    }`

testsToFix.forEach(testFile => {
  if (fs.existsSync(testFile)) {
    let content = fs.readFileSync(testFile, 'utf8')

    // Add mock if not already present
    if (!content.includes('mockPlacementSuggestions')) {
      // Find the first import statement and add the mock after the imports
      const importEndIndex = content.lastIndexOf('import ')
      const nextLineIndex = content.indexOf('\n', importEndIndex)
      content = content.slice(0, nextLineIndex + 1) + mockPlacementSuggestionsCode + '\n' + content.slice(nextLineIndex + 1)
    }

    // Replace mount(CanvasView) patterns
    content = content.replace(/mount\(CanvasView\)/g, `mount(CanvasView, ${provideCode})`)

    fs.writeFileSync(testFile, content)
    console.log(`Fixed: ${testFile}`)
  }
})

console.log('Done!')
