"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const streamifier_1 = __importDefault(require("streamifier"));
const uploadToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({ folder }, (error, result) => {
            if (error) {
                reject(error);
            }
            else if (result) {
                resolve(result.secure_url);
            }
            else {
                reject(new Error("Upload failed"));
            }
        });
        streamifier_1.default.createReadStream(buffer).pipe(stream);
    });
};
exports.default = uploadToCloudinary;
