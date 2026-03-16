import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * 認証情報の状態を厳密に監視し、浄化（.trim()）を行います。
 */
export async function POST(request: Request) {
  // 環境変数の取得と浄化
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  // --- INFRASTRUCTURE CHECK (地上管制診断ログ) ---
  console.log("--- INFRASTRUCTURE CHECK ---");
  console.log("[Upload API] TARGET_CLOUD_NAME:", cloudName || "❌ MISSING");
  console.log("[Upload API] API_KEY_STATUS:", apiKey ? "✅ OK" : "❌ MISSING");
  console.log("[Upload API] API_SECRET_STATUS:", apiSecret ? "✅ OK" : "❌ MISSING");
  console.log("-----------------------------");

  try {
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: "Cloudinary設定が不完全です", 
        details: `.env.local の値を確認し、サーバーを再起動してください。` 
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
            console.error("Cloudinary SDK Error Detailed:", error);
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
    
    let details = "Cloudinaryの認証に失敗しました。";
    if (error.message?.includes("Invalid cloud_name")) {
      details = `Cloudinary 側で [${cloudName}] という名称が認識されませんでした。ハイフンとアンダースコアの違いなどを再確認してください。`;
    } else if (error.http_code === 401) {
      details = "API Key または Secret が正しくありません。最新の値をコピーしてください。";
    }

    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details
    }, { status: 500 });
  }
}
