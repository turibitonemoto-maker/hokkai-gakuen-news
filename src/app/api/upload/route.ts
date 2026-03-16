
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * Turbopack の環境変数読み込み不良を回避するため、物理的に鍵を注入。
 */
export async function POST(request: Request) {
  try {
    // 物理的な鍵の注入（最高司令官より受領した真の通行証）
    cloudinary.config({
      cloud_name: "dl2yqrpfj",
      api_key: "217388631115892",
      // ★最高司令官へ：以下のダブルクォーテーションの中に、ご自身の API Secret を貼り付けてください
      api_secret: "ここにAPI_SECRETを直接貼り付けてください", 
    });

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
