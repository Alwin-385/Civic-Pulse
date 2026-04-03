"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureInitialData = void 0;
const prisma_1 = __importDefault(require("./prisma"));
const ensureInitialData = async () => {
    // Seed department records so the frontend can map category -> departmentId.
    // (Safe to run multiple times.)
    await prisma_1.default.department.upsert({
        where: { name: "KSEB" },
        update: {},
        create: { name: "KSEB", description: "Kerala State Electricity Board" },
    });
    await prisma_1.default.department.upsert({
        where: { name: "PWD" },
        update: {},
        create: { name: "PWD", description: "Public Works Department" },
    });
};
exports.ensureInitialData = ensureInitialData;
