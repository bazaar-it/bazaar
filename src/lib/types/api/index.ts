// src/lib/types/api/index.ts

/**
 * Central export for all API-related types
 * Simplified 3-tool architecture
 */

// Export golden rule contracts (primary)
export * from './golden-rule-contracts';

// Export simplified tool contracts (new architecture)
export * from './tool-contracts.simplified';

// Export service contracts
export * from './service-contracts';

// Export legacy contracts (being phased out)
export * from './tool-contracts';
export * from './field-mapping';
EOF < /dev/null