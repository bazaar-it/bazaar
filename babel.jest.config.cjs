/**
 * @type {import('@babel/core').TransformOptions}
 */
module.exports = {
  presets: [
    // Allow importing ESM modules from node_modules
    ["@babel/preset-env", { 
      "modules": "commonjs",
      "targets": { "node": "current" }
    }],
    "@babel/preset-react",
    "@babel/preset-typescript"
  ],
  plugins: [
    "@babel/plugin-transform-runtime",
    // Support dynamic imports
    "@babel/plugin-syntax-dynamic-import",
    // Transform import.meta for better ESM compatibility
    "babel-plugin-transform-import-meta",
    // Add class properties support (using transform instead of proposal)
    ["@babel/plugin-transform-class-properties", { "loose": true }],
    // Add private methods support (using transform instead of proposal)
    ["@babel/plugin-transform-private-methods", { "loose": true }]
  ],
  // Removed explicit ignore pattern to let Jest's transformIgnorePatterns control node_modules transformation
};
