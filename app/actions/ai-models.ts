"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAiModels() {
  try {
    const models = await db.aiModel.findMany({
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
    // Check for existing company or create default
    let company = await db.company.findFirst();
    if (!company) {
      // Create a default user and company if none exist (bootstrapping)
      const user = await db.user.create({
        data: {
          email: "admin@example.com",
          name: "Admin",
        },
      });
      company = await db.company.create({
        data: {
          name: "Default Company",
          ownerId: user.id,
        },
      });
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
        companyId: company.id,
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
