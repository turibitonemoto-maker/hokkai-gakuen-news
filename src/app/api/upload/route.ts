import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * インフラの健全性をターミナルに叫びます。
 */
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // --- INFRASTRUCTURE CHECK (地上管制ログ) ---
  console.log("--- INFRASTRUCTURE CHECK ---");
  console.log("TARGET_CLOUD_NAME:", cloudName || "❌ MISSING");
  console.log("CLOUDINARY_API_KEY:", apiKey ? "✅ OK" : "❌ MISSING");
  console.log("CLOUDINARY_API_SECRET:", apiSecret ? "✅ OK" : "❌ MISSING (Check .env.local)");
  console.log("-----------------------------");

  try {
    // 必須情報の欠落チェック
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: "Cloudinary設定が不完全です", 
        details: ".env.local が正しい階層（プロジェクトルート）にあるか、変数が定義されているか確認してください。" 
      }, { status: 500 });
    }

    // 設定の適用
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret, 
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // サーバーサイドからの直接アップロード
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
      details: `Cloudinary への接続に失敗しました。Cloud Name [${cloudName}] が正しいか、Cloudinaryダッシュボードで再確認してください。`
    }, { status: 500 });
  }
}
