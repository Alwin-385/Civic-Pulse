"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complaintSchema = void 0;
const zod_1 = require("zod");
exports.complaintSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(5),
    location: zod_1.z.string().min(3),
    severity: zod_1.z.string().min(1),
    departmentId: zod_1.z.number(),
    imageUrl: zod_1.z.string().url().optional()
});
