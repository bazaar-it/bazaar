// src/remotion/index.tsx
import { registerRoot } from "remotion";
// Use simple version for Lambda compatibility
import { MainComposition } from "./MainCompositionSimple";

// Register the root component
registerRoot(MainComposition);