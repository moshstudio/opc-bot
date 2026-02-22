"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import {
  WorkflowNode,
  WorkflowEdge,
  WorkflowDefinition,
} from "@/lib/workflow/types";
import { toast } from "sonner";

/**
 * 获取工作流的结构化数据字符串，用于比较是否真实发生了结构或数据的深度变化
 * 排除掉选选中状态、展开状态等 UI 状态
 */
export const getWorkflowStructuralData = (nodes: any[], edges: any[]) => {
  return JSON.stringify({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
      style: n.style,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      label: e.label,
      style: e.style,
    })),
  });
};

export type SaveStatus = "saved" | "saving" | "unsaved";

interface UseWorkflowSaveOptions {
  nodes: Node[];
  edges: Edge[];
  onSave: (workflow: WorkflowDefinition) => void | Promise<void>;
  autoSaveMs?: number;
}

/**
 * 用于主画布的保存逻辑 Hook
 * 处理手动保存、自动保存以及保存状态管理
 */
export function useWorkflowSave({
  nodes,
  edges,
  onSave,
  autoSaveMs = 1000,
}: UseWorkflowSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  // 使用 state 存储上次保存的数据快照，用于渲染期间的同步比较（代替 Ref 访问）
  const [lastSavedData, setLastSavedData] = useState<string | null>(null);
  const lastSavedRef = useRef<string>("");

  // 获取工作流的结构化快照
  const currentData = useMemo(
    () => getWorkflowStructuralData(nodes, edges),
    [nodes, edges],
  );

  // 在渲染期间同步调整状态（Adjusting state during rendering 模式）
  // 这种模式下 React 会在屏幕更新前立即应用状态，避免 Effect 导致的级联渲染。
  // 我们使用 lastSavedData 状态而不是 Ref，以保持渲染函数的纯度。
  if (lastSavedData === null) {
    setLastSavedData(currentData);
  } else if (currentData === lastSavedData) {
    if (saveStatus !== "saved" && saveStatus !== "saving") {
      setSaveStatus("saved");
    }
  } else if (saveStatus === "saved") {
    setSaveStatus("unsaved");
  }

  // 保证 lastSavedRef 与 lastSavedData 同步，以维持向后兼容性
  useEffect(() => {
    if (lastSavedData !== null) {
      lastSavedRef.current = lastSavedData;
    }
  }, [lastSavedData]);

  // 手动保存函数
  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await onSave({
        nodes: nodes as any as WorkflowNode[],
        edges: edges as any as WorkflowEdge[],
      });
      const savedSnapshot = getWorkflowStructuralData(nodes, edges);
      setLastSavedData(savedSnapshot);
      setSaveStatus("saved");
      toast.success("工作流已手动保存");
    } catch (error) {
      console.error("Manual save failed:", error);
      setSaveStatus("unsaved");
      toast.error("保存失败");
    }
  }, [nodes, edges, onSave]);

  // 自动保存逻辑：仅处理异步计时器
  useEffect(() => {
    if (saveStatus !== "unsaved") return;

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await onSave({
          nodes: nodes as any as WorkflowNode[],
          edges: edges as any as WorkflowEdge[],
        });
        const savedSnapshot = getWorkflowStructuralData(nodes, edges);
        setLastSavedData(savedSnapshot);
        setSaveStatus("saved");
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus("unsaved");
      }
    }, autoSaveMs);

    return () => clearTimeout(timer);
  }, [saveStatus, currentData, onSave, autoSaveMs, nodes, edges]);

  return {
    saveStatus,
    handleSave,
    setSaveStatus,
    lastSavedRef,
  };
}

interface UseWorkflowSyncOptions {
  id: string;
  nodes: Node[];
  edges: Edge[];
  onSync: (nodes: Node[], edges: Edge[]) => void;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * 用于子画布（IterationNode）同步数据到父节点的 Hook
 */
export function useWorkflowSync({
  id,
  nodes,
  edges,
  onSync,
  debounceMs = 500,
  enabled = true,
}: UseWorkflowSyncOptions) {
  const lastSyncedRef = useRef<string>("");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    const currentData = getWorkflowStructuralData(nodes, edges);

    if (isFirstRender.current) {
      lastSyncedRef.current = currentData;
      isFirstRender.current = false;
      return;
    }

    // 如果结构化数据没变，跳过同步
    if (currentData === lastSyncedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      // 执行同步回调
      onSync(nodes, edges);
      // 更新已同步的快照
      lastSyncedRef.current = getWorkflowStructuralData(nodes, edges);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [nodes, edges, onSync, debounceMs, enabled, id]);

  return { lastSyncedRef };
}
