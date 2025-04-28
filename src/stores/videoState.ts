"use client";

import { create } from "zustand";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import type { InputProps } from "../types/input-props";

interface VideoState {
  inputProps: InputProps | null;
  applyPatch: (patch: Operation[]) => void;
  replace: (next: InputProps) => void;
}

export const useVideoState = create<VideoState>((set) => ({
  inputProps: null,

  applyPatch: (patch: Operation[]) =>
    set((state) => ({
      inputProps: state.inputProps
        ? applyPatch(structuredClone(state.inputProps), patch, /* validate */ true)
            .newDocument
        : state.inputProps, // nothing loaded yet
    })),

  replace: (next: InputProps) => set({ inputProps: next }),
})); 