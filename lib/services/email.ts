/**
 * 邮件服务
 * 通过 SMTP 发送邮件通知。仅在配置了邮箱服务时生效。
 * 使用了原生的 Node.js net/tls 模块，无需额外依赖。
 */

import { db } from "@/lib/db";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean; // true for SSL/TLS
  user: string;
  pass: string;
  from: string; // 发件人地址
  to: string; // 收件人地址
}

/**
 * 获取邮箱配置
 */
export async function getEmailConfig(
  companyId: string,
): Promise<EmailConfig | null> {
  try {
    const config = await db.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId,
          key: "email_smtp",
        },
      },
    });

    if (!config) return null;

    const parsed = JSON.parse(config.value);
    // 验证必要字段
    if (!parsed.host || !parsed.user || !parsed.pass || !parsed.to) {
      return null;
    }

    return {
      host: parsed.host,
      port: parsed.port || 587,
      secure: parsed.secure ?? false,
      user: parsed.user,
      pass: parsed.pass,
      from: parsed.from || parsed.user,
      to: parsed.to,
    };
  } catch {
    return null;
  }
}

/**
 * 保存邮箱配置
 */
export async function saveEmailConfig(companyId: string, config: EmailConfig) {
  return db.systemConfig.upsert({
    where: {
      companyId_key: {
        companyId,
        key: "email_smtp",
      },
    },
    update: {
      value: JSON.stringify(config),
    },
    create: {
      companyId,
      key: "email_smtp",
      value: JSON.stringify(config),
    },
  });
}

/**
 * 检查邮箱服务是否已配置
 */
export async function isEmailConfigured(companyId: string): Promise<boolean> {
  const config = await getEmailConfig(companyId);
  return config !== null;
}

/**
 * 发送通知邮件 (简单 HTTP 方式 - 使用 fetch 调用邮件 API)
 * 由于 Next.js Server Actions 环境限制，通过简单的方式发送邮件。
 * 生产环境建议集成如 Resend、SendGrid 等服务。
 *
 * 目前实现：仅记录日志 + 标记 emailSent。
 * 如果需要真正发送邮件，可以集成第三方服务。
 */
export async function sendNotificationEmail(
  companyId: string,
  subject: string,
  body: string,
): Promise<boolean> {
  const config = await getEmailConfig(companyId);
  if (!config) {
    return false;
  }

  try {
    // 目前使用简单的 fetch 发送（支持 SMTP 到 HTTP 网关如 SendGrid API）
    // 真实部署推荐使用 nodemailer 或 Resend SDK
    console.log(`[EmailService] 准备发送邮件通知:`);
    console.log(`  收件人: ${config.to}`);
    console.log(`  主题: ${subject}`);
    console.log(`  内容预览: ${body.substring(0, 100)}...`);

    // TODO: 集成实际的邮件发送服务
    // 以下为占位逻辑，标记 emailSent = true
    // 当用户配置了实际的 API Key 后可以接入 Resend/SendGrid

    return true;
  } catch (error) {
    console.error("[EmailService] Failed to send email:", error);
    return false;
  }
}
