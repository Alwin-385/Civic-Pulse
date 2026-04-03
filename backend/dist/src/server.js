"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const ensureInitialData_1 = require("./config/ensureInitialData");
const passport_1 = require("./config/passport");
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
(0, passport_1.configurePassport)();
(0, ensureInitialData_1.ensureInitialData)()
    .catch((err) => {
    console.error("Failed to ensure initial data:", err);
})
    .finally(() => {
    app_1.default.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
