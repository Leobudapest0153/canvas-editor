/* eslint-env node */
module.exports = {
  overrides: [
    {
      files: ["src/__tests__/**/*.spec.js"],
      env: { vitest: true, browser: true },
    },
  ],
}
