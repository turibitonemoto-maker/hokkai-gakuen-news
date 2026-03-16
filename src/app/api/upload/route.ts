import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * 認証情報（Cloud Name, API Key, API Secret）の状態を厳密に監視し、
 * 不一致がある場合はターミナルへ詳細な診断ログを出力します。
 */
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // --- INFRASTRUCTURE CHECK (地上管制診断ログ) ---
  console.log("--- INFRASTRUCTURE CHECK ---");
  console.log("TARGET_CLOUD_NAME:", cloudName || "❌ MISSING");
  console.log("CLOUDINARY_API_KEY:", apiKey ? "✅ OK" : "❌ MISSING");
  console.log("CLOUDINARY_API_SECRET:", apiSecret ? "✅ OK" : "❌ MISSING");
  console.log("-----------------------------");

  try {
    // 必須情報の欠落チェック
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: "Cloudinary設定が不完全です", 
        details: `.env.local の値が正しいか、Cloudinaryダッシュボードで再確認してください。設定後はサーバー（npm run dev）の再起動が必要です。` 
      }, { status: 500 });
    }

    // 設定の適用 (ハンドラー内で確実に実行)
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

    // サーバーサイドからの直接アップロード (署名エラーを物理回避)
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
    // Cloudinary からのエラーをより具体的に返却
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details: `Cloudinary 側で [${cloudName}] というクラウド名が認識されませんでした。ダッシュボードの名称と一字一句違わないか（アンダースコア _ とハイフン - の違いなど）確認してください。`
    }, { status: 500 });
  }
}
