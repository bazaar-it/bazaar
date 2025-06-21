"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/fn.name";
exports.ids = ["vendor-chunks/fn.name"];
exports.modules = {

/***/ "(rsc)/../../node_modules/fn.name/index.js":
/*!*******************************************!*\
  !*** ../../node_modules/fn.name/index.js ***!
  \*******************************************/
/***/ ((module) => {

eval("\n\nvar toString = Object.prototype.toString;\n\n/**\n * Extract names from functions.\n *\n * @param {Function} fn The function who's name we need to extract.\n * @returns {String} The name of the function.\n * @public\n */\nmodule.exports = function name(fn) {\n  if ('string' === typeof fn.displayName && fn.constructor.name) {\n    return fn.displayName;\n  } else if ('string' === typeof fn.name && fn.name) {\n    return fn.name;\n  }\n\n  //\n  // Check to see if the constructor has a name.\n  //\n  if (\n       'object' === typeof fn\n    && fn.constructor\n    && 'string' === typeof fn.constructor.name\n  ) return fn.constructor.name;\n\n  //\n  // toString the given function and attempt to parse it out of it, or determine\n  // the class.\n  //\n  var named = fn.toString()\n    , type = toString.call(fn).slice(8, -1);\n\n  if ('Function' === type) {\n    named = named.substring(named.indexOf('(') + 1, named.indexOf(')'));\n  } else {\n    named = type;\n  }\n\n  return named || 'anonymous';\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL2ZuLm5hbWUvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQWE7O0FBRWI7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxVQUFVO0FBQ3JCLGFBQWEsUUFBUTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBOztBQUVBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9tYXJrdXNob2duZS9Eb2N1bWVudHMvQVBQUy9iYXphYXItdmlkL2JhemFhci12aWQvbm9kZV9tb2R1bGVzL2ZuLm5hbWUvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKipcbiAqIEV4dHJhY3QgbmFtZXMgZnJvbSBmdW5jdGlvbnMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHdobydzIG5hbWUgd2UgbmVlZCB0byBleHRyYWN0LlxuICogQHJldHVybnMge1N0cmluZ30gVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uLlxuICogQHB1YmxpY1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5hbWUoZm4pIHtcbiAgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgZm4uZGlzcGxheU5hbWUgJiYgZm4uY29uc3RydWN0b3IubmFtZSkge1xuICAgIHJldHVybiBmbi5kaXNwbGF5TmFtZTtcbiAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIGZuLm5hbWUgJiYgZm4ubmFtZSkge1xuICAgIHJldHVybiBmbi5uYW1lO1xuICB9XG5cbiAgLy9cbiAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBjb25zdHJ1Y3RvciBoYXMgYSBuYW1lLlxuICAvL1xuICBpZiAoXG4gICAgICAgJ29iamVjdCcgPT09IHR5cGVvZiBmblxuICAgICYmIGZuLmNvbnN0cnVjdG9yXG4gICAgJiYgJ3N0cmluZycgPT09IHR5cGVvZiBmbi5jb25zdHJ1Y3Rvci5uYW1lXG4gICkgcmV0dXJuIGZuLmNvbnN0cnVjdG9yLm5hbWU7XG5cbiAgLy9cbiAgLy8gdG9TdHJpbmcgdGhlIGdpdmVuIGZ1bmN0aW9uIGFuZCBhdHRlbXB0IHRvIHBhcnNlIGl0IG91dCBvZiBpdCwgb3IgZGV0ZXJtaW5lXG4gIC8vIHRoZSBjbGFzcy5cbiAgLy9cbiAgdmFyIG5hbWVkID0gZm4udG9TdHJpbmcoKVxuICAgICwgdHlwZSA9IHRvU3RyaW5nLmNhbGwoZm4pLnNsaWNlKDgsIC0xKTtcblxuICBpZiAoJ0Z1bmN0aW9uJyA9PT0gdHlwZSkge1xuICAgIG5hbWVkID0gbmFtZWQuc3Vic3RyaW5nKG5hbWVkLmluZGV4T2YoJygnKSArIDEsIG5hbWVkLmluZGV4T2YoJyknKSk7XG4gIH0gZWxzZSB7XG4gICAgbmFtZWQgPSB0eXBlO1xuICB9XG5cbiAgcmV0dXJuIG5hbWVkIHx8ICdhbm9ueW1vdXMnO1xufTtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/fn.name/index.js\n");

/***/ })

};
;