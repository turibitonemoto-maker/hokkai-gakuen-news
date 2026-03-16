import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * 秘密鍵は環境変数からのみ取得し、セキュリティを最大化します。
 */
export async function POST(request: Request) {
  try {
    // 環境変数からの設定読み込み
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dl2yqrpfj",
      api_key: process.env.CLOUDINARY_API_KEY || "217388631115892",
      api_secret: process.env.CLOUDINARY_API_SECRET, 
    });

    // API Secret が未設定の場合はエラーを返す
    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ 
        error: "API Secretが未設定です", 
        details: ".env.local に CLOUDINARY_API_SECRET を設定し、サーバーを再起動してください。" 
      }, { status: 500 });
    }

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
      details: "環境変数の設定またはネットワーク設定を確認してください。"
    }, { status: 500 });
  }
}
