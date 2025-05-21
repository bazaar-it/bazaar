// memory-bank/sprints/sprint25/BAZAAR-263-shared-modules.md
# BAZAAR-263 Shared Module System

This document outlines the new shared module registry that allows custom components to reuse common utilities.

## Overview

- Modules are registered via `sharedModuleRegistry.register(name, version, module)`.
- Modules can be retrieved with `sharedModuleRegistry.get(name)`.
- Version information is stored using `setModuleVersion` and `getModuleVersion`.

## Usage Example

```ts
import { sharedModuleRegistry, setModuleVersion } from '~/shared/modules';

function setup() {
  sharedModuleRegistry.register('colorUtils', '1.0.0', {
    hexToRgb(hex: string) {
      /* ... */
    }
  });
  setModuleVersion({ name: 'colorUtils', version: '1.0.0' });
}
```

See `src/shared/modules` for implementation details.
