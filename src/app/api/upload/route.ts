import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * セキュリティのため秘密鍵は環境変数からのみ取得します。
 */
export async function POST(request: Request) {
  // --- INFRASTRUCTURE CHECK (地上管制ログ) ---
  console.log("--- INFRASTRUCTURE CHECK ---");
  console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ OK" : "❌ NG");
  console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "✅ OK" : "❌ NG");
  console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "✅ OK" : "❌ NG (Check .env.local location)");
  console.log("-----------------------------");

  try {
    // API Secret が未設定の場合は、具体的な解決策を返す
    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ 
        error: "API Secretが未設定です", 
        details: ".env.local がプロジェクトのルート（srcの外）にあるか確認し、サーバーを再起動してください。" 
      }, { status: 500 });
    }

    // 設定の適用
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET, 
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // サーバーサイドからの直接アップロード（署名エラーを物理的に回避）
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "newspaper_archive/pages",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary SDK Error:", error);
            reject(error);
          } else {
            console.log("Cloudinary Upload Success!");
            resolve(result);
          }
        }
      ).end(buffer);
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Upload API Route Error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details: "Cloudinary への物理接続に失敗しました。"
    }, { status: 500 });
  }
}
