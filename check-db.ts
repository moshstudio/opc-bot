import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const companyCount = await prisma.company.count();
  const employeeCount = await prisma.employee.count();
  const taskCount = await prisma.task.count();

  console.log(`Users: ${userCount}`);
  console.log(`Companies: ${companyCount}`);
  console.log(`Employees: ${employeeCount}`);
  console.log(`Tasks: ${taskCount}`);

  if (employeeCount === 0) {
    console.log("No employees found. Recommend creating default employees.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
