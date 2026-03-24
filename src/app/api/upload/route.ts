
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * クラウドストレージ（Cloudinary）への搬入口
 * デプロイ環境での安定性を確保するため、タイムアウト対策と英名フォルダ処理を強化。
 */
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary credentials missing in environment" }, { status: 500 });
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    // フォルダ名が指定されていない、または日本語等の場合は安全なデフォルトを使用
    const rawFolder = formData.get("folder") as string;
    const folder = rawFolder && /^[a-zA-Z0-9_\-/]+$/.test(rawFolder) ? rawFolder : "newspaper_archive_uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary stream upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json(uploadResult);
  } catch (error: any) {
    console.error("Cloudinary Upload API Error:", error);
    return NextResponse.json({ 
      error: "Upload failed",
      message: error.message
    }, { status: 500 });
  }
}
