"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AISuggestionContextType {
  hasActiveSuggestion: boolean;
  setHasActiveSuggestion: (value: boolean) => void;
}

const AISuggestionContext = createContext<AISuggestionContextType>({
  hasActiveSuggestion: false,
  setHasActiveSuggestion: () => {},
});

export function AISuggestionProvider({ children }: { children: ReactNode }) {
  const [hasActiveSuggestion, setHasActiveSuggestion] = useState(false);

  return (
    <AISuggestionContext.Provider
      value={{ hasActiveSuggestion, setHasActiveSuggestion }}
    >
      {children}
    </AISuggestionContext.Provider>
  );
}

export function useAISuggestion() {
  return useContext(AISuggestionContext);
}
