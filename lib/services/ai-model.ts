import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const aiModelService = {
  async getModels(companyId: string) {
    return prisma.aiModel.findMany({
      where: { companyId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async createModel(data: Prisma.AiModelCreateInput) {
    // If this is the first embedding model, set as active (others inactive logic handled in frontend/service coordination usually, but let's keep it simple)
    // For now just create
    return prisma.aiModel.create({
      data,
    });
  },

  async updateModel(id: string, data: Prisma.AiModelUpdateInput) {
    return prisma.aiModel.update({
      where: { id },
      data,
    });
  },

  async deleteModel(id: string) {
    return prisma.aiModel.delete({
      where: { id },
    });
  },

  async getModelById(id: string) {
    return prisma.aiModel.findUnique({
      where: { id },
    });
  },
};
