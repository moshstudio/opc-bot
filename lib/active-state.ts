/**
 * 这是一个全局状态管理器，用于追踪当前正在前端活跃的公司。
 * 主要用于在“后台运行”选项关闭时，判断异步任务是否应该继续执行。
 */

interface ActiveState {
  // 这里的 Key 是 ownerId 或 sessionId，但在单人版中我们简单处理
  activeCompanyId: string | null;
}

const globalForActiveState = global as unknown as {
  activeState: ActiveState;
};

export const activeState = globalForActiveState.activeState || {
  activeCompanyId: null,
};

if (process.env.NODE_ENV !== "production") {
  globalForActiveState.activeState = activeState;
}

export function setActiveCompany(companyId: string) {
  activeState.activeCompanyId = companyId;
}

export function getActiveCompanyId() {
  return activeState.activeCompanyId;
}
