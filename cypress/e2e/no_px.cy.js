/* global cy, describe, it */
describe('No px texts', () => {
  it('should not display px in editor or panel', () => {
    cy.visit('/')
    // eslint-disable-next-line no-restricted-syntax
    cy.contains('px').should('not.exist')
  })
})
