
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

// デプロイ環境でのタイムアウト対策
export const maxDuration = 60;

export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  try {
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: "Cloudinary settings incomplete", 
      }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret, 
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "newspaper_archive/uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary uploader error:", error);
            reject(error);
          }
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cloudinary Upload API Error:", error);
    return NextResponse.json({ 
      error: "Upload failed",
      details: error.message
    }, { status: 500 });
  }
}
