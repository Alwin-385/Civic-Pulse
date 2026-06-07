import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { ensureInitialData } from "./config/ensureInitialData";
import { configurePassport } from "./config/passport";

const PORT = process.env.PORT || 5000;

configurePassport();

ensureInitialData()
  .catch((err) => {
    console.error("Failed to ensure initial data:", err);
    if (String(err).includes("Can't reach database server")) {
      console.error(
        "\n[DATABASE] Cannot reach Supabase. Open your Supabase dashboard, restore/unpause the project, copy a fresh connection string into backend/.env as DATABASE_URL, then run: npx prisma db push\n"
      );
    }
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      const dbHost = process.env.DATABASE_URL?.match(/@([^/?:]+)/)?.[1] ?? "not configured";
      console.log(`Database host: ${dbHost}`);
    });
  });