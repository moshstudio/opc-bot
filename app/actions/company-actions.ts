"use server";

import { db } from "@/lib/db";

const prisma = db;

export async function getOrCreateCompany() {
  try {
    // For this "solopreneur" app, we'll assume one main user/company for now.
    // In a real app, we'd use session/auth to find the user's company.

    // 1. Try to find the first company
    const company = await prisma.company.findFirst();

    if (company) {
      return { success: true, company };
    }

    // 2. If no company, create a default user and company
    // Check if default user exists
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

    const newCompany = await prisma.company.create({
      data: {
        name: "My AI Company",
        ownerId: user.id,
      },
    });

    return { success: true, company: newCompany };
  } catch (error: any) {
    console.error("Failed to get or create company:", error);
    return { success: false, error: error.message };
  }
}
