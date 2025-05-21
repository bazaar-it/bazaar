// src/shared/modules/versions.ts

export interface ModuleVersionInfo {
  name: string;
  version: string;
  description?: string;
}

const versions: Record<string, ModuleVersionInfo> = {};

export function setModuleVersion(info: ModuleVersionInfo) {
  versions[info.name] = info;
}

export function getModuleVersion(name: string): ModuleVersionInfo | undefined {
  return versions[name];
}

export function listModuleVersions(): ModuleVersionInfo[] {
  return Object.values(versions);
}
