
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * 環境変数が読めないケースに備え、Cloud Name と API Key を物理的に注入。
 */
export async function POST(request: Request) {
  try {
    // 物理的な鍵の注入（最高司令官より受領した真の通行証）
    cloudinary.config({
      cloud_name: "dl2yqrpfj",
      api_key: "217388631115892",
      api_secret: process.env.CLOUDINARY_API_SECRET, // Secret は .env.local から取得
    });

    // APIキーの存在確認（最終防衛ライン）
    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ 
        error: "CLOUDINARY_API_SECRET is missing in .env.local" 
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
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
          if (error) {
            console.error("Cloudinary Upload Error:", error);
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
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
