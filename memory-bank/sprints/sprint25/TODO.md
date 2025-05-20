//memory-bank/sprints/sprint25/TODO.md
# Sprint 25 TODO

## Custom Component Improvements

### ESM Module Migration

- ✅ BAZAAR-255: Update build pipeline from IIFE to ESM module format
  - ✅ Change esbuild configuration to output ESM modules
  - ✅ Remove the globalName option for window.__REMOTION_COMPONENT
  - ✅ Update external dependencies configuration
  - ✅ Fix code sanitization for ESM compatibility

- ✅ BAZAAR-256: Update component loading mechanism to use React.lazy
  - ✅ Rewrite useRemoteComponent hook to use React.lazy 
  - ✅ Implement proper error boundaries and Suspense support
  - ✅ Handle different export patterns (default vs named exports)
  - ✅ Remove deprecated window.__REMOTION_COMPONENT usage

- ✅ BAZAAR-257: Update component templates for ESM compatibility
  - ✅ Update the component template to use proper ESM export syntax
  - ✅ Remove IIFE wrappers and global namespace pollution
  - ✅ Add explicit default exports for React.lazy compatibility

- ✅ BAZAAR-258: Handle runtime dependencies appropriately
  - ✅ Update dependency handling in build pipeline
  - ✅ Mark React and Remotion as external dependencies
  - ✅ Preserve imports during build process

- ✅ BAZAAR-260: Complete test coverage for the new ESM workflow
  - ✅ Test React.lazy component loading
  - ✅ Test ESM module format output
  - ✅ Test different component export patterns
  - ✅ Test external dependency handling
  - ✅ Basic server-side suite complete

### Next Steps

- [ ] BAZAAR-259: Prototype server-side wrapper
  - [ ] Implement server-side component validation
  - [ ] Create rendering safeguards

- [ ] BAZAAR-261: Update documentation for ESM components
  - [ ] Add developer guide for creating ESM-compatible components
  - [ ] Update API documentation to reflect new component loading pattern

- [ ] BAZAAR-262: Performance testing for ESM components
  - [ ] Measure component load time before and after ESM migration
  - [ ] Track memory usage with new component loading approach
  - [ ] Benchmark React.lazy vs script tag approach

- [ ] BAZAAR-263: Implement shared module system
  - [ ] Create a system for shared utilities across components
  - [ ] Implement version management for shared modules
  - [ ] Add documentation for using shared modules