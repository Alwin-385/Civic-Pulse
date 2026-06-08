import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { ensureInitialData } from "./config/ensureInitialData";
import { configurePassport } from "./config/passport";
import { sanitizeDatabaseUrl } from "./utils/databaseUrl";
import prisma from "./config/prisma";

const PORT = process.env.PORT || 5000;

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = sanitizeDatabaseUrl(process.env.DATABASE_URL);
}

configurePassport();

const start = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await ensureInitialData();
    console.log("[DATABASE] Connected and schema ready");
  } catch (err) {
    console.error("Failed to connect or seed database:", err);
    console.error(
      "\n[DATABASE] Check DATABASE_URL on Render (session pooler port 5432, no quotes). Run: npx prisma db push\n"
    );
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    const dbHost = process.env.DATABASE_URL?.match(/@([^/?:]+)/)?.[1] ?? "not configured";
    console.log(`Database host: ${dbHost}`);
  });
};

start();