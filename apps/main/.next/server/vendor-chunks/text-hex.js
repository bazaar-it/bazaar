"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/text-hex";
exports.ids = ["vendor-chunks/text-hex"];
exports.modules = {

/***/ "(rsc)/../../node_modules/text-hex/index.js":
/*!********************************************!*\
  !*** ../../node_modules/text-hex/index.js ***!
  \********************************************/
/***/ ((module) => {

eval("\n\n/***\n * Convert string to hex color.\n *\n * @param {String} str Text to hash and convert to hex.\n * @returns {String}\n * @api public\n */\nmodule.exports = function hex(str) {\n  for (\n    var i = 0, hash = 0;\n    i < str.length;\n    hash = str.charCodeAt(i++) + ((hash << 5) - hash)\n  );\n\n  var color = Math.floor(\n    Math.abs(\n      (Math.sin(hash) * 10000) % 1 * 16777216\n    )\n  ).toString(16);\n\n  return '#' + Array(6 - color.length + 1).join('0') + color;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL3RleHQtaGV4L2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFhOztBQUViO0FBQ0E7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9tYXJrdXNob2duZS9Eb2N1bWVudHMvQVBQUy9iYXphYXItdmlkL2JhemFhci12aWQvbm9kZV9tb2R1bGVzL3RleHQtaGV4L2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuLyoqKlxuICogQ29udmVydCBzdHJpbmcgdG8gaGV4IGNvbG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGV4dCB0byBoYXNoIGFuZCBjb252ZXJ0IHRvIGhleC5cbiAqIEByZXR1cm5zIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhleChzdHIpIHtcbiAgZm9yIChcbiAgICB2YXIgaSA9IDAsIGhhc2ggPSAwO1xuICAgIGkgPCBzdHIubGVuZ3RoO1xuICAgIGhhc2ggPSBzdHIuY2hhckNvZGVBdChpKyspICsgKChoYXNoIDw8IDUpIC0gaGFzaClcbiAgKTtcblxuICB2YXIgY29sb3IgPSBNYXRoLmZsb29yKFxuICAgIE1hdGguYWJzKFxuICAgICAgKE1hdGguc2luKGhhc2gpICogMTAwMDApICUgMSAqIDE2Nzc3MjE2XG4gICAgKVxuICApLnRvU3RyaW5nKDE2KTtcblxuICByZXR1cm4gJyMnICsgQXJyYXkoNiAtIGNvbG9yLmxlbmd0aCArIDEpLmpvaW4oJzAnKSArIGNvbG9yO1xufTtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/text-hex/index.js\n");

/***/ })

};
;