"use server";

import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { ROLE_TEMPLATES } from "@/components/canvas/add-employee/templates";
import { setActiveCompany } from "@/lib/active-state";

const prisma = db;

export async function updateCompany(id: string, data: { name?: string }) {
  try {
    const updated = await prisma.company.update({
      where: { id },
      data,
    });
    return { success: true, company: updated };
  } catch (error: any) {
    console.error("Failed to update company:", error);
    return { success: false, error: error.message };
  }
}

export async function getOrCreateCompany() {
  try {
    const cookieStore = await cookies(); // next 15/14 async cookie store sometimes
    const activeCompanyId = cookieStore.get("activeCompanyId")?.value;

    let company = null;
    if (activeCompanyId) {
      company = await prisma.company.findUnique({
        where: { id: activeCompanyId },
      });
    }

    if (!company) {
      // Find any first company if active company not found
      company = await prisma.company.findFirst({
        orderBy: { createdAt: "desc" },
      });
    }

    if (company) {
      // We can't always set cookies in all contexts, but Next.js allows it in Server Actions
      try {
        cookieStore.set("activeCompanyId", company.id);
        setActiveCompany(company.id);
      } catch {
        // Ignore if headers are already sent
      }
      return { success: true, company };
    }

    // Ensure default user exists
    let user = await prisma.user.findUnique({
      where: { email: "owner@example.com" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "owner@example.com",
          name: "Solopreneur",
        },
      });
    }

    // Do not auto-create company anymore
    return { success: true, company: null };
  } catch (error: any) {
    console.error("Failed to get or create company:", error);
    return { success: false, error: error.message };
  }
}

export async function getCompanies() {
  try {
    let user = await prisma.user.findUnique({
      where: { email: "owner@example.com" },
    });
    if (!user) {
      await getOrCreateCompany(); // Initialize
      user = await prisma.user.findUnique({
        where: { email: "owner@example.com" },
      });
    }

    const companies = await prisma.company.findMany({
      where: { ownerId: user?.id },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, companies };
  } catch (error: any) {
    console.error("Failed to get companies:", error);
    return { success: false, error: error.message };
  }
}

export async function switchCompany(companyId: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set("activeCompanyId", companyId);
    setActiveCompany(companyId);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to switch company:", error);
    return { success: false, error: error.message };
  }
}

export async function createCompany(name: string, type: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "owner@example.com" },
    });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const newCompany = await prisma.company.create({
      data: {
        name,
        type,
        ownerId: user.id,
      },
    });

    // Preset employees based on type
    const presetEmployees = getPresetEmployees(type);
    if (presetEmployees.length > 0) {
      await Promise.all(
        presetEmployees.map((emp) =>
          prisma.employee.create({
            data: {
              ...emp,
              companyId: newCompany.id,
            },
          }),
        ),
      );
    }

    // Auto switch to new company
    const cookieStore = await cookies();
    cookieStore.set("activeCompanyId", newCompany.id);

    return { success: true, company: newCompany };
  } catch (error: any) {
    console.error("Failed to create company:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCompany(companyId: string) {
  try {
    const cookieStore = await cookies();
    const activeCompanyId = cookieStore.get("activeCompanyId")?.value;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return { success: false, error: "Company not found" };
    }

    // Start manual cascading delete due to sqlite foreign keys w/o onDelete set
    await prisma.$transaction([
      prisma.aiModel.deleteMany({ where: { companyId } }),
      prisma.systemConfig.deleteMany({ where: { companyId } }),
      prisma.notification.deleteMany({ where: { companyId } }),
      prisma.document.deleteMany({ where: { knowledgeBase: { companyId } } }),
      prisma.knowledgeBase.deleteMany({ where: { companyId } }),
      prisma.task.deleteMany({ where: { companyId } }),
      prisma.message.deleteMany({ where: { employee: { companyId } } }),
      prisma.employeeLog.deleteMany({ where: { employee: { companyId } } }),
      prisma.employeeLink.deleteMany({ where: { source: { companyId } } }),
      // For employee self-relations, it's safer to just deleteMany
      prisma.employee.deleteMany({ where: { companyId } }),
      prisma.company.delete({ where: { id: companyId } }),
    ]);

    if (activeCompanyId === companyId) {
      cookieStore.delete("activeCompanyId");
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete company:", error);
    return { success: false, error: error.message };
  }
}

function getPresetEmployees(type: string) {
  let keys: (keyof typeof ROLE_TEMPLATES)[] = [];

  switch (type) {
    case "developer":
      keys = [
        "assistant",
        "life_assistant",
        "devops",
        "deployment",
        "product_manager",
        "fullstack_engineer",
        "qa_engineer",
      ];
      break;
    case "media":
      keys = ["copywriter", "video_director", "social_media_manager"];
      break;
    case "education":
      keys = ["instructional_designer", "assessment_manager", "tutor"];
      break;
    case "custom":
    default:
      keys = ["general_assistant"];
      break;
  }

  return keys
    .map((key) => {
      const template = ROLE_TEMPLATES[key];
      if (!template) return null;

      return {
        name: template.defaultName,
        role: template.label,
        config: JSON.stringify({
          model: "", // 不再预设硬编码模型
          temperature: 0.7,
          prompt: template.prompt,
          requiresGithub: template.requiresGithub,
          requiresIDE: template.requiresIDE,
        }),
        workflow: template.workflow ? JSON.stringify(template.workflow) : null,
        status: "idle",
        isActive: false,
      };
    })
    .filter((emp): emp is NonNullable<typeof emp> => emp !== null);
}

export async function checkCurrentCompanyStatus() {
  try {
    const cookieStore = await cookies();
    const activeCompanyId = cookieStore.get("activeCompanyId")?.value;

    if (!activeCompanyId) {
      return { success: false, status: "error", messages: [] };
    }

    const messages = [];

    // Check models
    const modelCount = await prisma.aiModel.count({
      where: { companyId: activeCompanyId, isActive: true },
    });

    if (modelCount === 0) {
      messages.push({
        type: "error",
        message: "未配置任何 AI 模型，多数 AI 员工将无法正常工作",
        actionText: "去配置模型",
        actionLink: "/dashboard/models",
      });
    }

    // 检查核心大脑 (Brain) 配置
    const brainModelConfig = await prisma.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId: activeCompanyId,
          key: "BRAIN_MODEL_ID",
        },
      },
    });

    if (!brainModelConfig?.value) {
      messages.push({
        type: "error",
        message: "核心大脑模型尚未配置，建议尽快完成设置以避免后续任务处理中断",
        actionText: "去配置大脑",
        actionLink: "/dashboard/settings",
      });
    } else {
      // 验证配置的模型是否有效
      const aiModel = await prisma.aiModel.findUnique({
        where: { id: brainModelConfig.value },
      });
      if (!aiModel || !aiModel.isActive) {
        messages.push({
          type: "error",
          message: "配置的核心大脑模型已失效或不存在，请重新指定",
          actionText: "去配置大脑",
          actionLink: "/dashboard/settings",
        });
      }
    }

    // Check specific employee configurations
    const employees = await prisma.employee.findMany({
      where: { companyId: activeCompanyId, isActive: true },
    });

    for (const emp of employees) {
      if (emp.config) {
        try {
          const config = JSON.parse(emp.config);

          if (!config.model) {
            messages.push({
              type: "warning",
              message: `员工 ${emp.name} (${emp.role}) 尚未配置大模型`,
              actionText: "去配置",
              actionLink: `/dashboard/employees`,
            });
          }

          if (config.requiresIDE) {
            if (!config.ide) {
              messages.push({
                type: "warning",
                message: `开发人员 ${emp.name} (${emp.role}) 尚未配置指定 IDE`,
                actionText: "去配置",
                actionLink: `/dashboard/employees`,
              });
            }
          }

          if (config.requiresGithub) {
            if (!config.githubToken && !config.github_token) {
              messages.push({
                type: "warning",
                message: `工程师 ${emp.name} (${emp.role}) 尚未配置 GitHub 授权`,
                actionText: "去配置",
                actionLink: `/dashboard/employees`,
              });
            }
          }
        } catch {
          // format issue, skip
        }
      } else {
        messages.push({
          type: "warning",
          message: `员工 ${emp.name} (${emp.role}) 缺少必要配置`,
          actionText: "去配置",
          actionLink: `/dashboard/employees`,
        });
      }
    }

    const hasError = messages.some((m) => m.type === "error");
    return {
      success: true,
      status: messages.length === 0 ? "normal" : hasError ? "error" : "warning",
      messages,
    };
  } catch (error: any) {
    console.error("Failed to check company status:", error);
    return {
      success: false,
      status: "error",
      messages: [{ type: "error", message: "状态检查失败" }],
    };
  }
}

export async function getBackgroundSchedulerStatus() {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) return false;

    const config = await db.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId: res.company.id,
          key: "BACKGROUND_SCHEDULER_ENABLED",
        },
      },
    });

    return config?.value === "true";
  } catch (error) {
    console.error("Error fetching background scheduler status:", error);
    return false;
  }
}

export async function setBackgroundSchedulerStatus(enabled: boolean) {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) {
      throw new Error("Unable to determine active company");
    }

    await db.systemConfig.upsert({
      where: {
        companyId_key: {
          companyId: res.company.id,
          key: "BACKGROUND_SCHEDULER_ENABLED",
        },
      },
      update: {
        value: enabled ? "true" : "false",
      },
      create: {
        companyId: res.company.id,
        key: "BACKGROUND_SCHEDULER_ENABLED",
        value: enabled ? "true" : "false",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error setting background scheduler status:", error);
    return { success: false, error: (error as any).message };
  }
}
