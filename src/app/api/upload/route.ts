
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

// デプロイ環境（本番サーバー）でのタイムアウトを防止するための設定
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * 高精細画像の自動圧縮 ＆ 最適化アップロード API
 */
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary settings missing" }, { status: 500 });
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawFolder = formData.get("folder") as string;
    
    // 常に英数字ベースの安全なフォルダ名を使用
    const folder = rawFolder && /^[a-zA-Z0-9_\-/]+$/.test(rawFolder) ? rawFolder : "newspaper_archive";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder, 
          resource_type: "auto",
          // 高精細を維持しつつ自動圧縮
          quality: "auto",
          // WebPなどの次世代形式へ自動変換
          fetch_format: "auto",
          flags: "attachment:false"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json(uploadResult);
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
