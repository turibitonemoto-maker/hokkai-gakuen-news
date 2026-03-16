
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * 環境変数 CLOUDINARY_API_SECRET を優先し、未設定時はプレースホルダーを確認します。
 */
export async function POST(request: Request) {
  try {
    // 【最高司令官（作成者様）へ】
    // 1. .env.local に CLOUDINARY_API_SECRET="あなたの秘密鍵" を記述してください。
    // 2. 記述後は必ず npm run dev (または preview) を再起動してください。
    // 3. 環境変数を使わない場合は、下記の API_SECRET 直接入力欄を書き換えてください。
    const API_SECRET = process.env.CLOUDINARY_API_SECRET || "ここにAPI_SECRETを直接貼り付けてください";

    if (API_SECRET === "ここにAPI_SECRETを直接貼り付けてください") {
      return NextResponse.json({ 
        error: "API Secretが未設定です", 
        details: ".env.local に CLOUDINARY_API_SECRET を設定し、サーバーを再起動してください。または src/app/api/upload/route.ts 内のプレースホルダーを直接書き換えてください。" 
      }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: "dl2yqrpfj",
      api_key: "217388631115892",
      api_secret: API_SECRET, 
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "newspaper_archive",
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
      details: "API Secretまたはネットワーク設定を確認してください。"
    }, { status: 500 });
  }
}
