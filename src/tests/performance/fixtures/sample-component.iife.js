// src/tests/performance/fixtures/sample-component.iife.js
(function(global){
  global.SampleComponent = function() {
    return 'sample';
  };
})(typeof window !== 'undefined' ? window : globalThis);
