---
description: 工作流系统升级实施计划 - 将员工管理+指令派发升级为可视化工作流系统
---

# 工作流系统升级计划

## 核心设计理念

参考 Dify / Coze 的工作流设计，将现有的"老板发指令 → 员工执行"简单模式，
升级为**可视化 DAG 工作流编排系统**，支持：

1. 多种节点类型（LLM、条件判断、HTTP请求、代码执行、子员工委派）
2. 节点间数据传递（变量系统）
3. 条件分支与并行执行
4. 工作流运行时引擎（按 DAG 拓扑排序执行）
5. 实时执行状态可视化

## Phase 1: 扩展节点类型系统

### 新增节点类型

- **condition** - 条件判断节点（If/Else 分支）
- **http_request** - HTTP 请求节点
- **code** - 代码执行节点（JavaScript）
- **text_template** - 文本模板节点（变量替换）
- **variable_assigner** - 变量赋值节点
- **message** - 中间消息输出节点

### 修改文件

- `components/canvas/workflow/WorkflowNodeTypes.tsx` - 添加新节点组件
- `components/canvas/workflow/WorkflowCanvas.tsx` - 注册新节点，添加工具栏

## Phase 2: 工作流执行引擎

### 创建文件

- `lib/workflow/workflow-engine.ts` - DAG 执行引擎核心
- `lib/workflow/node-executors.ts` - 各节点类型的执行器
- `lib/workflow/types.ts` - 工作流类型定义

### 核心能力

- 拓扑排序
- 节点间变量传递
- 条件分支支持
- 并行执行支持
- 执行状态回调

## Phase 3: 整合到员工系统

### 修改文件

- `app/actions/chat-actions.ts` - sendMessage 使用工作流引擎
- `app/dashboard/employees/page.tsx` - Boss 调度走工作流
- `components/canvas/BossCommandBar.tsx` - UI 适配
- `components/canvas/BossResultPanel.tsx` - 显示工作流执行详情

## Phase 4: 执行可视化

### 在工作流画布上显示执行状态

- 节点高亮（执行中/完成/失败）
- 运行日志
- 数据流可视化
