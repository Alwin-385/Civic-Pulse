import prisma from "./prisma";

export const ensureInitialData = async () => {
  // Seed department records so the frontend can map category -> departmentId.
  // (Safe to run multiple times.)
  await prisma.department.upsert({
    where: { name: "KSEB" },
    update: {},
    create: { name: "KSEB", description: "Kerala State Electricity Board" },
  });

  await prisma.department.upsert({
    where: { name: "PWD" },
    update: {},
    create: { name: "PWD", description: "Public Works Department" },
  });
};

