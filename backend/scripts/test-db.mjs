import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
const prisma = new PrismaClient();

try {
  const count = await prisma.user.count();
  console.log("user count:", count);
  const email = `test-oauth-${Date.now()}@gmail.com`;
  const user = await prisma.user.create({
    data: {
      name: "Test",
      email,
      password: "google-oauth-placeholder",
      role: "CITIZEN",
      emailVerifiedAt: new Date(),
      googleId: `gid-${Date.now()}`,
    },
  });
  console.log("create ok:", user.id);
  await prisma.user.delete({ where: { id: user.id } });
  console.log("delete ok");
} catch (e) {
  console.error("FAIL:", e.code ?? "", e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
