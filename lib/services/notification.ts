/**
 * 通知服务
 * 管理站内通知的创建、查询、标记已读等操作。
 */

import { db } from "@/lib/db";

export type NotificationType =
  | "info"
  | "warning"
  | "error"
  | "success"
  | "summary";
export type NotificationSource = "ivy" | "system" | "employee";

export interface CreateNotificationParams {
  companyId: string;
  title: string;
  content: string;
  type?: NotificationType;
  source?: NotificationSource;
  sourceId?: string;
}

/**
 * 创建一条通知
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await db.notification.create({
      data: {
        companyId: params.companyId,
        title: params.title,
        content: params.content,
        type: params.type || "info",
        source: params.source || "system",
        sourceId: params.sourceId,
      },
    });
    return notification;
  } catch (error) {
    console.error("[Notification] Failed to create notification:", error);
    return null;
  }
}

/**
 * 获取通知列表
 */
export async function getNotifications(
  companyId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const where: Record<string, unknown> = { companyId };
  if (options?.unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.notification.count({ where: { companyId } }),
    db.notification.count({ where: { companyId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * 标记通知为已读
 */
export async function markNotificationRead(notificationId: string) {
  return db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(companyId: string) {
  return db.notification.updateMany({
    where: { companyId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId: string) {
  return db.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * 清理旧通知（保留最近 7 天）
 */
export async function cleanOldNotifications(companyId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db.notification.deleteMany({
    where: {
      companyId,
      isRead: true,
      createdAt: { lt: sevenDaysAgo },
    },
  });
}
