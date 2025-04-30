// src/remotion/index.ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
// Use Remotion-specific CSS for better isolation/compatibility
import "./style.css";

registerRoot(RemotionRoot);