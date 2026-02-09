import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create User
  const user = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      email: "owner@example.com",
      name: "独立创业者",
    },
  });
  console.log("User created:", user.id);

  // 2. Create Company
  let company = await prisma.company.findFirst({ where: { ownerId: user.id } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "我的 AI 公司",
        ownerId: user.id,
      },
    });
    console.log("Company created:", company.id);
  } else {
    console.log("Company already exists:", company.id);
  }

  // 3. Create Employees
  const roles = [
    { name: "AI 助理", role: "assistant" },
    { name: "运维工程师", role: "devops" },
    { name: "产品经理", role: "product_manager" },
  ];

  for (const r of roles) {
    const exists = await prisma.employee.findFirst({
      where: { companyId: company.id, role: r.role },
    });

    if (!exists) {
      await prisma.employee.create({
        data: {
          name: r.name,
          role: r.role,
          companyId: company.id,
          status: "idle",
        },
      });
      console.log(`Employee ${r.name} created.`);
    }
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
