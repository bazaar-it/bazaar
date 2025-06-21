"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/functions-have-names";
exports.ids = ["vendor-chunks/functions-have-names"];
exports.modules = {

/***/ "(rsc)/../../node_modules/functions-have-names/index.js":
/*!********************************************************!*\
  !*** ../../node_modules/functions-have-names/index.js ***!
  \********************************************************/
/***/ ((module) => {

eval("\n\nvar functionsHaveNames = function functionsHaveNames() {\n\treturn typeof function f() {}.name === 'string';\n};\n\nvar gOPD = Object.getOwnPropertyDescriptor;\nif (gOPD) {\n\ttry {\n\t\tgOPD([], 'length');\n\t} catch (e) {\n\t\t// IE 8 has a broken gOPD\n\t\tgOPD = null;\n\t}\n}\n\nfunctionsHaveNames.functionsHaveConfigurableNames = function functionsHaveConfigurableNames() {\n\tif (!functionsHaveNames() || !gOPD) {\n\t\treturn false;\n\t}\n\tvar desc = gOPD(function () {}, 'name');\n\treturn !!desc && !!desc.configurable;\n};\n\nvar $bind = Function.prototype.bind;\n\nfunctionsHaveNames.boundFunctionsHaveNames = function boundFunctionsHaveNames() {\n\treturn functionsHaveNames() && typeof $bind === 'function' && function f() {}.bind().name !== '';\n};\n\nmodule.exports = functionsHaveNames;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL2Z1bmN0aW9ucy1oYXZlLW5hbWVzL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFhOztBQUViO0FBQ0EsOEJBQThCO0FBQzlCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCO0FBQy9CO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSw4RUFBOEU7QUFDOUU7O0FBRUEiLCJzb3VyY2VzIjpbIi9Vc2Vycy9tYXJrdXNob2duZS9Eb2N1bWVudHMvQVBQUy9iYXphYXItdmlkL2JhemFhci12aWQvbm9kZV9tb2R1bGVzL2Z1bmN0aW9ucy1oYXZlLW5hbWVzL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxudmFyIGZ1bmN0aW9uc0hhdmVOYW1lcyA9IGZ1bmN0aW9uIGZ1bmN0aW9uc0hhdmVOYW1lcygpIHtcblx0cmV0dXJuIHR5cGVvZiBmdW5jdGlvbiBmKCkge30ubmFtZSA9PT0gJ3N0cmluZyc7XG59O1xuXG52YXIgZ09QRCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG5pZiAoZ09QRCkge1xuXHR0cnkge1xuXHRcdGdPUEQoW10sICdsZW5ndGgnKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdC8vIElFIDggaGFzIGEgYnJva2VuIGdPUERcblx0XHRnT1BEID0gbnVsbDtcblx0fVxufVxuXG5mdW5jdGlvbnNIYXZlTmFtZXMuZnVuY3Rpb25zSGF2ZUNvbmZpZ3VyYWJsZU5hbWVzID0gZnVuY3Rpb24gZnVuY3Rpb25zSGF2ZUNvbmZpZ3VyYWJsZU5hbWVzKCkge1xuXHRpZiAoIWZ1bmN0aW9uc0hhdmVOYW1lcygpIHx8ICFnT1BEKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cdHZhciBkZXNjID0gZ09QRChmdW5jdGlvbiAoKSB7fSwgJ25hbWUnKTtcblx0cmV0dXJuICEhZGVzYyAmJiAhIWRlc2MuY29uZmlndXJhYmxlO1xufTtcblxudmFyICRiaW5kID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQ7XG5cbmZ1bmN0aW9uc0hhdmVOYW1lcy5ib3VuZEZ1bmN0aW9uc0hhdmVOYW1lcyA9IGZ1bmN0aW9uIGJvdW5kRnVuY3Rpb25zSGF2ZU5hbWVzKCkge1xuXHRyZXR1cm4gZnVuY3Rpb25zSGF2ZU5hbWVzKCkgJiYgdHlwZW9mICRiaW5kID09PSAnZnVuY3Rpb24nICYmIGZ1bmN0aW9uIGYoKSB7fS5iaW5kKCkubmFtZSAhPT0gJyc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uc0hhdmVOYW1lcztcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/functions-have-names/index.js\n");

/***/ })

};
;