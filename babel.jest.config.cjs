/**
 * @type {import('@babel/core').TransformOptions}
 */
module.exports = {
  presets: [
    // Allow importing ESM modules from node_modules
    ["@babel/preset-env", { 
      "modules": "auto",
      "targets": { "node": "current" }
    }],
    "@babel/preset-react",
    "@babel/preset-typescript"
  ],
  plugins: [
    "@babel/plugin-transform-runtime",
    // Support dynamic imports
    "@babel/plugin-syntax-dynamic-import",
    // Uncomment this when testing code that imports CJS modules from ESM
    // or when you encounter "Cannot use import statement outside a module" errors
    "babel-plugin-transform-import-meta"
  ]
};
