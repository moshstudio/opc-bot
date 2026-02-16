"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
  getAiModels,
  createAiModel,
  updateAiModel,
  deleteAiModel,
} from "@/app/actions/ai-models";
import { toast } from "sonner";

export type ModelProviderType =
  | "openai"
  | "google"
  | "anthropic"
  | "transformers"
  | "custom";

export type ModelCategory = "chat" | "embedding";

export interface Model {
  id: string; // Unique ID
  name: string; // Display Name
  provider: ModelProviderType;
  category: ModelCategory;
  baseUrl: string;
  apiKey?: string;
  supportsImages: boolean;
  isActive?: boolean;
}

interface ModelContextType {
  models: Model[];
  addModel: (model: Partial<Model>) => Promise<void>;
  removeModel: (id: string) => Promise<void>;
  updateModel: (id: string, model: Partial<Model>) => Promise<void>;
  activeEmbeddingModel: Model | undefined;
  isLoading: boolean;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Database on mount
  useEffect(() => {
    async function loadModels() {
      try {
        const data = await getAiModels();
        setModels(data as any[]);
      } catch (e) {
        console.error("Failed to load models from DB", e);
        toast.error("加载模型列表失败");
      } finally {
        setIsLoading(false);
      }
    }
    loadModels();
  }, []);

  const addModel = async (modelData: Partial<Model>) => {
    const tempId = nanoid();
    const newModel = {
      ...modelData,
      id: tempId,
      isActive: true,
      category: modelData.category || "chat",
    } as Model;

    setModels((prev) => [...prev, newModel]);

    try {
      const saved = await createAiModel(newModel);
      setModels((prev) =>
        prev.map((m) => (m.id === tempId ? (saved as unknown as Model) : m)),
      );
      toast.success("模型已保存");
    } catch (e) {
      console.error("Failed to create model", e);
      setModels((prev) => prev.filter((m) => m.id !== tempId)); // Rollback
      toast.error("保存模型失败");
    }
  };

  const removeModel = async (id: string) => {
    const originalModels = [...models];
    setModels((prev) => prev.filter((m) => m.id !== id));

    try {
      await deleteAiModel(id);
      toast.success("模型已删除");
    } catch (e) {
      console.error("Failed to delete model", e);
      setModels(originalModels); // Rollback
      toast.error("删除模型失败");
    }
  };

  const updateModel = async (id: string, updates: Partial<Model>) => {
    const originalModels = [...models];
    setModels((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, ...updates };
        }
        // If updates an active embedding model, deactivate others of same category
        if (
          updates.isActive &&
          updates.category === "embedding" &&
          m.category === "embedding" &&
          m.id !== id
        ) {
          return { ...m, isActive: false };
        }
        return m;
      }),
    );

    try {
      await updateAiModel(id, updates);
      toast.success("模型已更新");
    } catch (e) {
      console.error("Failed to update model", e);
      setModels(originalModels); // Rollback
      toast.error("更新模型失败");
    }
  };

  const activeEmbeddingModel = models.find(
    (m) => m.category === "embedding" && m.isActive,
  );

  return (
    <ModelContext.Provider
      value={{
        models,
        addModel,
        removeModel,
        updateModel,
        activeEmbeddingModel,
        isLoading,
      }}
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
