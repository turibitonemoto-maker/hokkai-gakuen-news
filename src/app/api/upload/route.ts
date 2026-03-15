
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 */
export async function POST(request: Request) {
  try {
    // 環境変数の取得
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dl2yqrpfj";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // APIキーの存在確認
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: "Must supply api_key and api_secret. Please check your .env.local file." 
      }, { status: 500 });
    }

    // Cloudinary の構成設定（リクエスト毎に確実に適用）
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ファイルをバッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cloudinary へストリームアップロード
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "newspaper_archive",
          resource_type: "auto",
          transformation: [{ quality: "auto", fetch_format: "auto" }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cloudinary upload API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
