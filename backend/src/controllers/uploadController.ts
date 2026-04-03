import { Request, Response } from "express";
import uploadToCloudinary from "../utils/uploadToCloudinary";
import * as exifr from "exifr";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Try to detect GPS coordinates from the FIRST photo EXIF.
    let detectedLocation: string | null = null;
    const gps = await exifr.gps(files[0].buffer).catch(() => null);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      detectedLocation = `${gps.latitude}, ${gps.longitude}`;
    }

    // Process all images
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadToCloudinary(file.buffer, "civic-issues");
      urls.push(url);
    }

    return res.status(200).json({
      message: "Images uploaded successfully",
      urls,
      detectedLocation,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Image upload failed",
      error
    });
  }
};