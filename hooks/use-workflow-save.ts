"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const lastSavedRef = useRef<string>("");
  const isInitialized = useRef(false);

  // 手动保存函数
  const handleSave = useCallback(async () => {
    const currentData = getWorkflowStructuralData(nodes, edges);
    setSaveStatus("saving");
    try {
      await onSave({
        nodes: nodes as any as WorkflowNode[],
        edges: edges as any as WorkflowEdge[],
      });
      lastSavedRef.current = currentData;
      setSaveStatus("saved");
      toast.success("工作流已手动保存");
    } catch (error) {
      console.error("Manual save failed:", error);
      setSaveStatus("unsaved");
      toast.error("保存失败");
    }
  }, [nodes, edges, onSave]);

  // 自动保存逻辑
  useEffect(() => {
    const currentData = getWorkflowStructuralData(nodes, edges);

    // 初始挂载时初始化参考值
    if (!isInitialized.current) {
      lastSavedRef.current = currentData;
      isInitialized.current = true;
      return;
    }

    // 如果数据没有真实变化（仅 UI 状态如 selection 变化），则保持 saved 状态
    if (currentData === lastSavedRef.current) {
      setSaveStatus((prev) => (prev !== "saved" ? "saved" : prev));
      return;
    }

    // 发现变化，立即标记为未保存
    setSaveStatus("unsaved");

    // 开启防抖计时器执行自动保存
    const timer = setTimeout(async () => {
      // 再次确认数据是否仍处于变化状态
      const latestData = getWorkflowStructuralData(nodes, edges);
      if (latestData === lastSavedRef.current) {
        setSaveStatus("saved");
        return;
      }

      setSaveStatus("saving");
      try {
        await onSave({
          nodes: nodes as any as WorkflowNode[],
          edges: edges as any as WorkflowEdge[],
        });
        lastSavedRef.current = latestData;
        setSaveStatus("saved");
      } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus("unsaved");
      }
    }, autoSaveMs);

    return () => clearTimeout(timer);
  }, [nodes, edges, onSave, autoSaveMs]);

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
