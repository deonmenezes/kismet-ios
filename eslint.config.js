// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-web/*', 'build-ios/*'],
  },
  {
    // Config plugins run in Node (CommonJS) during prebuild.
    files: ['plugins/**/*.js', '*.config.js'],
    languageOptions: { globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' } },
  },
]);
