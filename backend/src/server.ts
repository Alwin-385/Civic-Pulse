import dotenv from "dotenv";
import app from "./app";
import { ensureInitialData } from "./config/ensureInitialData";
import { configurePassport } from "./config/passport";

dotenv.config();

const PORT = process.env.PORT || 5000;

configurePassport();

ensureInitialData()
  .catch((err) => {
    console.error("Failed to ensure initial data:", err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });