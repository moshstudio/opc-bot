"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ModelProviderType = "openai" | "google" | "anthropic" | "custom";

export interface Model {
  id: string; // Unique ID
  name: string; // Display Name
  provider: ModelProviderType;
  baseUrl: string;
  apiKey?: string;
  supportsImages: boolean;
}

interface ModelContextType {
  models: Model[];
  addModel: (model: Model) => void;
  removeModel: (id: string) => void;
  updateModel: (id: string, model: Partial<Model>) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("opc-models");
    if (stored) {
      try {
        // eslint-disable-next-line
        setModels(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse models from localStorage", e);
        setModels([]);
      }
    } else {
      setModels([]);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever models change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("opc-models", JSON.stringify(models));
    }
  }, [models, isLoaded]);

  const addModel = (model: Model) => {
    setModels((prev) => [...prev, model]);
  };

  const removeModel = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
  };

  const updateModel = (id: string, updates: Partial<Model>) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    );
  };

  return (
    <ModelContext.Provider
      value={{ models, addModel, removeModel, updateModel }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export const useModelContext = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModelContext must be used within a ModelProvider");
  }
  return context;
};
