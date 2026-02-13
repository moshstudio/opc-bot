"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/services/notification";
import {
  ivyScanAndSummarize,
  getIvyStatus,
} from "@/lib/services/ivy-assistant";
import { getOrCreateCompany } from "./company-actions";

/**
 * 获取当前公司的所有通知
 */
export async function getMyNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<
  | { success: true; notifications: any[]; total: number; unreadCount: number }
  | { success: false; error: string }
> {
  try {
    const companyRes = await getOrCreateCompany();
    if (!companyRes.success || !companyRes.company) {
      return { success: false as const, error: "Company not found" };
    }

    const result = await getNotifications(companyRes.company.id, options);
    return { success: true as const, ...result };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

/**
 * 标记通知为已读
 */
export async function readNotification(id: string) {
  try {
    await markNotificationRead(id);
    revalidatePath("/dashboard");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

/**
 * 标记所有通知为已读
 */
export async function readAllNotifications() {
  try {
    const companyRes = await getOrCreateCompany();
    if (!companyRes.success || !companyRes.company) {
      return { success: false as const, error: "Company not found" };
    }

    await markAllNotificationsRead(companyRes.company.id);
    revalidatePath("/dashboard");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

/**
 * 手动触发 Ivy 扫描并总结日志
 */
export async function triggerIvyAnalysis() {
  try {
    const companyRes = await getOrCreateCompany();
    if (!companyRes.success || !companyRes.company) {
      return { success: false as const, error: "Company not found" };
    }

    const result = await ivyScanAndSummarize(companyRes.company.id);
    revalidatePath("/dashboard");
    return result;
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

/**
 * 获取 Ivy 的当前运行状态
 */
export async function fetchIvyStatus() {
  try {
    const companyRes = await getOrCreateCompany();
    if (!companyRes.success || !companyRes.company) {
      return { success: false, error: "Company not found" };
    }

    const status = await getIvyStatus(companyRes.company.id);
    return { success: true as const, status };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

/**
 * 保存邮箱配置
 */
export async function updateEmailSettings(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  to: string;
  from?: string;
}) {
  try {
    const companyRes = await getOrCreateCompany();
    if (!companyRes.success || !companyRes.company) {
      return { success: false, error: "Company not found" };
    }

    await db.systemConfig.upsert({
      where: {
        companyId_key: {
          companyId: companyRes.company.id,
          key: "email_smtp",
        },
      },
      update: {
        value: JSON.stringify(config),
      },
      create: {
        companyId: companyRes.company.id,
        key: "email_smtp",
        value: JSON.stringify(config),
      },
    });

    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}

/**
 * 获取邮箱配置
 */
export async function fetchEmailSettings() {
  try {
    const companyRes = await getOrCreateCompany();
    if (!companyRes.success || !companyRes.company) {
      return { success: false, error: "Company not found" };
    }

    const config = await db.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId: companyRes.company.id,
          key: "email_smtp",
        },
      },
    });

    if (!config) return { success: true as const, config: null };
    return { success: true as const, config: JSON.parse(config.value) };
  } catch (error: any) {
    return { success: false as const, error: error.message };
  }
}
