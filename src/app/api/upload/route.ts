import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

export const maxDuration = 60; // タイムアウト対策

export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  try {
    if (!cloudName || !apiKey || !apiSecret) {
      console.error("[Upload API] Cloudinary credentials missing in environment variables.");
      return NextResponse.json({ 
        error: "Cloudinary設定が不完全です", 
        details: "環境変数が設定されていません。管理者に連絡してください。" 
      }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret, 
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "newspaper_archive/misc";

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
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
            console.error("Cloudinary SDK Error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ 
      error: "アップロード障害",
      details: error.message || "内部サーバーエラーが発生しました。"
    }, { status: 500 });
  }
}
