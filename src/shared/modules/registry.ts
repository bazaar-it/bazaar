// src/shared/modules/registry.ts

export interface SharedModule<T> {
  name: string;
  version: string;
  module: T;
}

class SharedModuleRegistry {
  private modules = new Map<string, SharedModule<unknown>>();

  register<T>(name: string, version: string, module: T): void {
    const existing = this.modules.get(name);
    if (existing) {
      if (existing.version !== version) {
        console.warn(
          `Replacing shared module '${name}' version ${existing.version} with ${version}`
        );
      }
    }
    this.modules.set(name, { name, version, module });
  }

  get<T>(name: string): T | undefined {
    const entry = this.modules.get(name);
    return entry?.module as T | undefined;
  }

  getVersion(name: string): string | undefined {
    return this.modules.get(name)?.version;
  }
}

export const sharedModuleRegistry = new SharedModuleRegistry();
