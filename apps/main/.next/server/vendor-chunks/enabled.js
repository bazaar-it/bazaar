"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/enabled";
exports.ids = ["vendor-chunks/enabled"];
exports.modules = {

/***/ "(rsc)/../../node_modules/enabled/index.js":
/*!*******************************************!*\
  !*** ../../node_modules/enabled/index.js ***!
  \*******************************************/
/***/ ((module) => {

eval("\n\n/**\n * Checks if a given namespace is allowed by the given variable.\n *\n * @param {String} name namespace that should be included.\n * @param {String} variable Value that needs to be tested.\n * @returns {Boolean} Indication if namespace is enabled.\n * @public\n */\nmodule.exports = function enabled(name, variable) {\n  if (!variable) return false;\n\n  var variables = variable.split(/[\\s,]+/)\n    , i = 0;\n\n  for (; i < variables.length; i++) {\n    variable = variables[i].replace('*', '.*?');\n\n    if ('-' === variable.charAt(0)) {\n      if ((new RegExp('^'+ variable.substr(1) +'$')).test(name)) {\n        return false;\n      }\n\n      continue;\n    }\n\n    if ((new RegExp('^'+ variable +'$')).test(name)) {\n      return true;\n    }\n  }\n\n  return false;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL2VuYWJsZWQvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQWE7O0FBRWI7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CLFdBQVcsUUFBUTtBQUNuQixhQUFhLFNBQVM7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxTQUFTLHNCQUFzQjtBQUMvQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9tYXJrdXNob2duZS9Eb2N1bWVudHMvQVBQUy9iYXphYXItdmlkL2JhemFhci12aWQvbm9kZV9tb2R1bGVzL2VuYWJsZWQvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIGdpdmVuIG5hbWVzcGFjZSBpcyBhbGxvd2VkIGJ5IHRoZSBnaXZlbiB2YXJpYWJsZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lc3BhY2UgdGhhdCBzaG91bGQgYmUgaW5jbHVkZWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFyaWFibGUgVmFsdWUgdGhhdCBuZWVkcyB0byBiZSB0ZXN0ZWQuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gSW5kaWNhdGlvbiBpZiBuYW1lc3BhY2UgaXMgZW5hYmxlZC5cbiAqIEBwdWJsaWNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbmFibGVkKG5hbWUsIHZhcmlhYmxlKSB7XG4gIGlmICghdmFyaWFibGUpIHJldHVybiBmYWxzZTtcblxuICB2YXIgdmFyaWFibGVzID0gdmFyaWFibGUuc3BsaXQoL1tcXHMsXSsvKVxuICAgICwgaSA9IDA7XG5cbiAgZm9yICg7IGkgPCB2YXJpYWJsZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXJpYWJsZSA9IHZhcmlhYmxlc1tpXS5yZXBsYWNlKCcqJywgJy4qPycpO1xuXG4gICAgaWYgKCctJyA9PT0gdmFyaWFibGUuY2hhckF0KDApKSB7XG4gICAgICBpZiAoKG5ldyBSZWdFeHAoJ14nKyB2YXJpYWJsZS5zdWJzdHIoMSkgKyckJykpLnRlc3QobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoKG5ldyBSZWdFeHAoJ14nKyB2YXJpYWJsZSArJyQnKSkudGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/enabled/index.js\n");

/***/ })

};
;