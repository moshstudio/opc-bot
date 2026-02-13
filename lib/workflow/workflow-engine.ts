// ==========================================
// 工作流系统 - DAG 执行引擎
// ==========================================
//
// 核心设计：
// 1. 解析 WorkflowDefinition 为 DAG
// 2. 拓扑排序确定执行顺序
// 3. 按序执行节点，支持条件分支
// 4. 节点间通过 context.variables 传递数据
// 5. 通过回调实时报告执行状态

import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowContext,
  WorkflowExecutionResult,
  NodeExecutionResult,
  ExecutionCallback,
  WorkflowNodeType,
} from "./types";
import { getExecutor } from "./node-executors";

/**
 * 工作流执行引擎
 */
export class WorkflowEngine {
  private definition: WorkflowDefinition;
  private context: WorkflowContext;
  private callback?: ExecutionCallback;
  private nodeResults: NodeExecutionResult[] = [];
  private adjacencyList: Map<
    string,
    { target: string; sourceHandle?: string }[]
  > = new Map();
  private nodeMap: Map<string, WorkflowNode> = new Map();

  constructor(
    definition: WorkflowDefinition,
    context: WorkflowContext,
    callback?: ExecutionCallback,
  ) {
    this.definition = definition;
    this.context = {
      ...context,
      variables: {
        ...context.variables,
        __input__: context.input,
        "sys.timestamp": String(Date.now()),
      },
    };
    this.callback = callback;

    // 构建邻接表和节点映射
    this.buildGraph();
  }

  private buildGraph() {
    // 建立节点映射
    for (const node of this.definition.nodes) {
      this.nodeMap.set(node.id, node);
      this.adjacencyList.set(node.id, []);
    }

    // 建立邻接关系
    for (const edge of this.definition.edges) {
      const neighbors = this.adjacencyList.get(edge.source) || [];
      neighbors.push({
        target: edge.target,
        sourceHandle: edge.sourceHandle,
      });
      this.adjacencyList.set(edge.source, neighbors);
    }
  }

  /**
   * 找到起始节点（type === "start" 的节点）
   */
  private findStartNode(): WorkflowNode | null {
    for (const node of this.definition.nodes) {
      if (
        node.type === "start" ||
        node.type === "cron_trigger" ||
        node.type === "webhook"
      )
        return node;
    }
    return null;
  }

  /**
   * 执行工作流
   */
  async execute(): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();

    try {
      const startNode = this.findStartNode();
      if (!startNode) {
        throw new Error("工作流缺少开始节点");
      }

      // 从开始节点开始深度优先遍历执行
      await this.executeNode(startNode.id);

      // 找到最终输出
      const outputResults = this.nodeResults.filter(
        (r) => r.nodeType === "output" && r.status === "completed",
      );
      const finalOutput =
        outputResults.length > 0
          ? outputResults[outputResults.length - 1].output || ""
          : this.getLastOutput();

      return {
        success: true,
        finalOutput,
        nodeResults: this.nodeResults,
        totalDuration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        finalOutput: "",
        nodeResults: this.nodeResults,
        totalDuration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * 递归执行节点及其后续节点
   */
  private async executeNode(nodeId: string): Promise<void> {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    // 检查是否已执行过（避免重复执行）
    if (this.nodeResults.find((r) => r.nodeId === nodeId)) return;

    const result: NodeExecutionResult = {
      nodeId: node.id,
      nodeType: node.type as WorkflowNodeType,
      nodeLabel: node.data.label || node.type,
      status: "running",
      startTime: Date.now(),
    };

    // 通知 UI 开始执行
    this.callback?.(nodeId, "running");

    try {
      const executor = getExecutor(node.type as WorkflowNodeType);
      const output = await executor.execute(node.data, this.context);

      // 将输出存入上下文变量
      this.context.variables[nodeId] = output;

      result.status = "completed";
      result.output = output;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;

      this.nodeResults.push(result);
      this.callback?.(nodeId, "completed", output);

      // 处理后续节点
      const neighbors = this.adjacencyList.get(nodeId) || [];

      if (node.type === "condition") {
        // 条件节点：根据输出选择分支
        const conditionResult = output; // "true" or "false"

        for (const neighbor of neighbors) {
          // 匹配 sourceHandle 或默认走 "true" 分支
          const isMatch =
            neighbor.sourceHandle === conditionResult ||
            (!neighbor.sourceHandle && conditionResult === "true");

          if (isMatch) {
            await this.executeNode(neighbor.target);
          } else {
            // 标记跳过的分支节点
            this.markSkipped(neighbor.target);
          }
        }
      } else {
        // 普通节点：执行所有后续节点（支持并行分支）
        if (neighbors.length === 1) {
          await this.executeNode(neighbors[0].target);
        } else if (neighbors.length > 1) {
          // 并行执行多个分支
          await Promise.all(neighbors.map((n) => this.executeNode(n.target)));
        }
      }
    } catch (error: any) {
      result.status = "failed";
      result.error = error.message;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;

      this.nodeResults.push(result);
      this.callback?.(nodeId, "failed", undefined, error.message);

      throw error; // 冒泡错误，停止工作流
    }
  }

  /**
   * 标记节点为跳过状态
   */
  private markSkipped(nodeId: string) {
    if (this.nodeResults.find((r) => r.nodeId === nodeId)) return;

    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    this.nodeResults.push({
      nodeId,
      nodeType: node.type as WorkflowNodeType,
      nodeLabel: node.data.label || node.type,
      status: "skipped",
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
    });

    this.callback?.(nodeId, "skipped");

    // 递归跳过后续节点
    const neighbors = this.adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      this.markSkipped(neighbor.target);
    }
  }

  /**
   * 获取最后一个完成节点的输出
   */
  private getLastOutput(): string {
    const completed = this.nodeResults.filter((r) => r.status === "completed");
    if (completed.length === 0) return "";
    return completed[completed.length - 1].output || "";
  }
}

/**
 * 便捷函数：执行工作流
 */
export async function executeWorkflow(
  definition: WorkflowDefinition,
  input: string,
  employeeId: string,
  employeeConfig?: {
    companyId?: string;
    model?: string;
    prompt?: string;
    temperature?: number;
    modelConfig?: {
      baseUrl?: string;
      apiKey?: string;
    };
  },
): Promise<WorkflowExecutionResult> {
  // 深度集成：使用 Mastra 执行引擎接管全量逻辑
  const { executeMastraWorkflow } = await import("../mastra/workflows");

  return executeMastraWorkflow(definition, input, employeeId, employeeConfig);
}
