"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/one-time";
exports.ids = ["vendor-chunks/one-time"];
exports.modules = {

/***/ "(rsc)/../../node_modules/one-time/index.js":
/*!********************************************!*\
  !*** ../../node_modules/one-time/index.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\n\nvar name = __webpack_require__(/*! fn.name */ \"(rsc)/../../node_modules/fn.name/index.js\");\n\n/**\n * Wrap callbacks to prevent double execution.\n *\n * @param {Function} fn Function that should only be called once.\n * @returns {Function} A wrapped callback which prevents multiple executions.\n * @public\n */\nmodule.exports = function one(fn) {\n  var called = 0\n    , value;\n\n  /**\n   * The function that prevents double execution.\n   *\n   * @private\n   */\n  function onetime() {\n    if (called) return value;\n\n    called = 1;\n    value = fn.apply(this, arguments);\n    fn = null;\n\n    return value;\n  }\n\n  //\n  // To make debugging more easy we want to use the name of the supplied\n  // function. So when you look at the functions that are assigned to event\n  // listeners you don't see a load of `onetime` functions but actually the\n  // names of the functions that this module will call.\n  //\n  // NOTE: We cannot override the `name` property, as that is `readOnly`\n  // property, so displayName will have to do.\n  //\n  onetime.displayName = name(fn);\n  return onetime;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL29uZS10aW1lL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFhOztBQUViLFdBQVcsbUJBQU8sQ0FBQywwREFBUzs7QUFFNUI7QUFDQTtBQUNBO0FBQ0EsV0FBVyxVQUFVO0FBQ3JCLGFBQWEsVUFBVTtBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL21hcmt1c2hvZ25lL0RvY3VtZW50cy9BUFBTL2JhemFhci12aWQvYmF6YWFyLXZpZC9ub2RlX21vZHVsZXMvb25lLXRpbWUvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbmFtZSA9IHJlcXVpcmUoJ2ZuLm5hbWUnKTtcblxuLyoqXG4gKiBXcmFwIGNhbGxiYWNrcyB0byBwcmV2ZW50IGRvdWJsZSBleGVjdXRpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRnVuY3Rpb24gdGhhdCBzaG91bGQgb25seSBiZSBjYWxsZWQgb25jZS5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gQSB3cmFwcGVkIGNhbGxiYWNrIHdoaWNoIHByZXZlbnRzIG11bHRpcGxlIGV4ZWN1dGlvbnMuXG4gKiBAcHVibGljXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gb25lKGZuKSB7XG4gIHZhciBjYWxsZWQgPSAwXG4gICAgLCB2YWx1ZTtcblxuICAvKipcbiAgICogVGhlIGZ1bmN0aW9uIHRoYXQgcHJldmVudHMgZG91YmxlIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIG9uZXRpbWUoKSB7XG4gICAgaWYgKGNhbGxlZCkgcmV0dXJuIHZhbHVlO1xuXG4gICAgY2FsbGVkID0gMTtcbiAgICB2YWx1ZSA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgZm4gPSBudWxsO1xuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLy9cbiAgLy8gVG8gbWFrZSBkZWJ1Z2dpbmcgbW9yZSBlYXN5IHdlIHdhbnQgdG8gdXNlIHRoZSBuYW1lIG9mIHRoZSBzdXBwbGllZFxuICAvLyBmdW5jdGlvbi4gU28gd2hlbiB5b3UgbG9vayBhdCB0aGUgZnVuY3Rpb25zIHRoYXQgYXJlIGFzc2lnbmVkIHRvIGV2ZW50XG4gIC8vIGxpc3RlbmVycyB5b3UgZG9uJ3Qgc2VlIGEgbG9hZCBvZiBgb25ldGltZWAgZnVuY3Rpb25zIGJ1dCBhY3R1YWxseSB0aGVcbiAgLy8gbmFtZXMgb2YgdGhlIGZ1bmN0aW9ucyB0aGF0IHRoaXMgbW9kdWxlIHdpbGwgY2FsbC5cbiAgLy9cbiAgLy8gTk9URTogV2UgY2Fubm90IG92ZXJyaWRlIHRoZSBgbmFtZWAgcHJvcGVydHksIGFzIHRoYXQgaXMgYHJlYWRPbmx5YFxuICAvLyBwcm9wZXJ0eSwgc28gZGlzcGxheU5hbWUgd2lsbCBoYXZlIHRvIGRvLlxuICAvL1xuICBvbmV0aW1lLmRpc3BsYXlOYW1lID0gbmFtZShmbik7XG4gIHJldHVybiBvbmV0aW1lO1xufTtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/one-time/index.js\n");

/***/ })

};
;