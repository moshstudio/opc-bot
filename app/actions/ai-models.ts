"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getOrCreateCompany } from "./company-actions";

export async function getAiModels() {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) return [];

    const models = await db.aiModel.findMany({
      where: { companyId: res.company.id },
      orderBy: { createdAt: "desc" },
    });
    return models;
  } catch (error) {
    console.error("Error fetching AI models:", error);
    return [];
  }
}

export async function createAiModel(data: any) {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) {
      throw new Error("Unable to determine active company");
    }

    const model = await db.aiModel.create({
      data: {
        name: data.name,
        provider: data.provider,
        category: data.category,
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
        supportsImages: data.supportsImages || false,
        isActive: data.isActive ?? true,
        companyId: res.company.id,
      },
    });

    revalidatePath("/dashboard/models");
    return model;
  } catch (error) {
    console.error("Error creating AI model:", error);
    throw error;
  }
}

export async function updateAiModel(id: string, data: any) {
  try {
    const model = await db.aiModel.update({
      where: { id },
      data: {
        name: data.name,
        provider: data.provider,
        category: data.category,
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
        supportsImages: data.supportsImages,
        isActive: data.isActive,
      },
    });

    revalidatePath("/dashboard/models");
    return model;
  } catch (error) {
    console.error("Error updating AI model:", error);
    throw error;
  }
}

export async function deleteAiModel(id: string) {
  try {
    await db.aiModel.delete({
      where: { id },
    });
    revalidatePath("/dashboard/models");
    return { success: true };
  } catch (error) {
    console.error("Error deleting AI model:", error);
    throw error;
  }
}

export async function getBrainModelId() {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) return null;

    const config = await db.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId: res.company.id,
          key: "BRAIN_MODEL_ID",
        },
      },
    });

    return config?.value || null;
  } catch (error) {
    console.error("Error fetching brain model ID:", error);
    return null;
  }
}

export async function setBrainModel(modelId: string) {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) {
      throw new Error("Unable to determine active company");
    }

    await db.systemConfig.upsert({
      where: {
        companyId_key: {
          companyId: res.company.id,
          key: "BRAIN_MODEL_ID",
        },
      },
      update: {
        value: modelId,
      },
      create: {
        companyId: res.company.id,
        key: "BRAIN_MODEL_ID",
        value: modelId,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/models");
    return { success: true };
  } catch (error) {
    console.error("Error setting brain model:", error);
    return { success: false, error: (error as any).message };
  }
}
export async function getLabelGenModelId() {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) return null;

    const config = await db.systemConfig.findUnique({
      where: {
        companyId_key: {
          companyId: res.company.id,
          key: "LABEL_GEN_MODEL_ID",
        },
      },
    });

    return config?.value || null;
  } catch (error) {
    console.error("Error fetching label generation model ID:", error);
    return null;
  }
}

export async function setLabelGenModel(modelId: string) {
  try {
    const res = await getOrCreateCompany();
    if (!res.success || !res.company) {
      throw new Error("Unable to determine active company");
    }

    await db.systemConfig.upsert({
      where: {
        companyId_key: {
          companyId: res.company.id,
          key: "LABEL_GEN_MODEL_ID",
        },
      },
      update: {
        value: modelId,
      },
      create: {
        companyId: res.company.id,
        key: "LABEL_GEN_MODEL_ID",
        value: modelId,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("Error setting label generation model:", error);
    return { success: false, error: (error as any).message };
  }
}
