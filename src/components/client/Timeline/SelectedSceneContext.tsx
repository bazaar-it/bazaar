//src/components/client/Timeline/SelectedSceneContext.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SelectedSceneContextType {
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
}

const SelectedSceneContext = createContext<SelectedSceneContextType>({
  selectedSceneId: null,
  setSelectedSceneId: () => {},
});

interface SelectedSceneProviderProps {
  children: React.ReactNode;
}

export const SelectedSceneProvider: React.FC<SelectedSceneProviderProps> = ({ children }) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  
  const handleSetSelectedSceneId = useCallback((id: string | null) => {
    setSelectedSceneId(id);
  }, []);
  
  return (
    <SelectedSceneContext.Provider
      value={{
        selectedSceneId,
        setSelectedSceneId: handleSetSelectedSceneId,
      }}
    >
      {children}
    </SelectedSceneContext.Provider>
  );
};

export const useSelectedScene = () => {
  const context = useContext(SelectedSceneContext);
  
  if (!context) {
    throw new Error('useSelectedScene must be used within a SelectedSceneProvider');
  }
  
  return context;
};
