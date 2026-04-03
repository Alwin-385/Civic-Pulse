import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error("Upload failed"));
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export default uploadToCloudinary;