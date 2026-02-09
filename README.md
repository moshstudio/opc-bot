# OPC-Bot: 一人公司智能化平台

这是一个适用于“一人公司”的智能化管理平台。你可以在这个平台上创建、管理 AI 员工，并通过可视化的方式编排他们的工作流，实现公司运营的自动化。

## 🚀 项目愿景

打造一个全自动化的公司运营系统，让超级个体（Solopreneur）能够通过 AI 员工团队，低成本、高效率地完成产品开发、营销、运营等全链路工作。

## ✨ 核心功能

1.  **员工管理 (Employee Management)**
    - **可视化画布**: 使用 React Flow 实现的交互式画布，直观展示公司组织架构。
    - **AI 员工创建**: 支持创建不同角色的 AI 员工（如助理、DevOps、产品经理等）。
    - **层级关系**: 支持拖拽连接，建立上下级汇报关系。

2.  **任务管理 (Task Management)**
    - **看板视图**: 提供 Kanban 风格的任务看板，直观管理任务状态（待办、进行中、已完成）。
    - **任务分配**: 支持创建任务并分配给特定的 AI 员工。
    - **实时追踪**: 实时更新任务进度，确保团队协作顺畅。

3.  **AI 智能交互 (AI Integration)**
    - **对话面板**: 点击员工节点即可开启对话。
    - **角色扮演**: 基于 LangChain，每个员工拥有独立的 System Prompt 和角色设定。
    - **具备记忆**: (开发中) 员工可以记住之前的指令和上下文。

4.  **知识库 (Knowledge Base)**
    - **企业大脑**: 集中管理公司内部文档、SOP 和业务知识。
    - **RAG 支持**: (开发中) AI 员工可以检索知识库内容来回答问题或执行任务。

5.  **仪表盘 (Dashboard)**
    - 简洁现代的 UI 设计 (Shadcn/UI + TailwindCSS)。
    - 侧边栏导航，快速切换不同模块。

## 🛠️ 技术栈

- **前端框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **UI 组件库**: Shadcn/UI, TailwindCSS, Lucide React
- **可视化库**: React Flow (@xyflow/react)
- **状态管理**: Zustand
- **后端/API**: Next.js Server Actions
- **数据库/ORM**: SQLite (默认), Prisma ORM
- **AI/LLM**: LangChain.js, OpenAI API

## 📂 目录结构

```
opc-bot/
├── app/
│   ├── actions/          # Server Actions (后端逻辑：任务、员工、公司管理)
│   ├── dashboard/        # 主要业务页面 (Dashboard, Employees, Tasks, Knowledge)
│   ├── api/              # API Routes (如有需要)
│   └── page.tsx          # Landing Page
├── components/
│   ├── canvas/           # 画布相关组件 (EmployeeCanvas, EmployeeNode)
│   ├── tasks/            # 任务管理组件 (TaskBoard, CreateTaskDialog)
│   ├── ui/               # Shadcn UI 基础组件
│   └── app-sidebar.tsx   # 应用侧边栏
├── lib/
│   ├── agents/           # AI Agent 工厂和定义
│   │   └── agent-factory.ts
│   ├── db.ts             # Prisma Client 单例
│   └── utils.ts          # 工具函数
├── prisma/
│   └── schema.prisma     # 数据库模型定义
└── public/               # 静态资源
```

## ⚡️ 快速开始

### 1. 环境准备

确保你的本地环境能够运行 Node.js (推荐 v20+) 和 pnpm。

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录创建一个 `.env` 文件，并填入以下内容：

```env
# 数据库连接 (默认使用本地 SQLite)
DATABASE_URL="file:./dev.db"

# OpenAI API Key (用于 AI 员工)
OPENAI_API_KEY="sk-..."
```

### 4. 初始化数据库

使用 Prisma 同步数据库结构并生成 Client：

```bash
pnpm exec prisma db push
pnpm exec prisma generate
```

(可选) 填充初始数据：

```bash
npx tsx seed-db.ts
```

### 5. 启动项目

```bash
pnpm dev
```

- 访问 [http://localhost:3000](http://localhost:3000) 即可看到 Landing Page。
- 访问 [http://localhost:3000/dashboard](http://localhost:3000/dashboard) 进入管理后台。

## 📖 开发指南

### 添加新的 AI 员工角色

1.  打开 `lib/agents/agent-factory.ts`。
2.  在 `ROLE_PROMPTS` 对象中添加新的角色定义和 System Prompt。
3.  (可选) 在 `components/canvas/AddEmployeeDialog.tsx` 的下拉菜单中添加对应选项。

### 扩展数据库模型

1.  修改 `prisma/schema.prisma`。
2.  运行 `pnpm exec prisma db push` 更新数据库。
3.  运行 `pnpm exec prisma generate` 更新类型定义。

## 🗺️ 后续优化规划 (Optimization Roadmap)

为了进一步提升平台的实用性和智能化程度，后续将重点优化以下方向：

### 1. 🧠 知识库增强 (RAG 2.0)

- **多格式支持**: 支持上传 PDF, Markdown, TXT 等多种格式的文档。
- **向量检索**: 集成向量数据库 (如 Pinecone 或本地 ChromaDB/PGVector)，实现语义级的高效检索。
- **自动引用**: AI 员工在回答时自动标注引用的知识库来源。

### 2. 🛠️ Agent 工具箱 (Tool Integration)

- **网络搜索**: 赋予 AI 员工实时联网搜索能力 (Tavily/SerpAPI)。
- **外部交互**: 集成 Gmail, Slack API，让 AI 员工能发送邮件或消息。
- **代码执行**: 集成代码解释器，允许 AI 编写并运行 Python/JS 脚本来处理数据。

### 3. 🤖 多智能体协作 (Multi-Agent Workflows)

- **LangGraph 集成**: 引入 LangGraph 框架，编排复杂的 Agent 工作流（如：产品经理 -> 开发 -> 测试）。
- **自主任务流转**: 任务完成后自动流转给下游员工，无需人工干预。

### 4. 🔐 用户系统与安全

- **多用户支持**: 集成 Clerk 或 NextAuth，支持多用户注册和登录。
- **数据隔离**: 确保不同用户的公司数据严格隔离。

### 5. 📱 体验优化

- **移动端适配**: 优化画布和看板在移动设备上的显示体验。
- **拖拽交互**: 增强看板和任务的拖拽交互体验。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来完善这个项目！
