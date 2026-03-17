
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * PDF対応画像・ドキュメントアップロード API
 * resource_type: "auto" により PDF も画像として扱わず、ドキュメントとして適切に保存します。
 */
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  try {
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ 
        error: "Cloudinary設定が不完全です", 
        details: ".env.local を確認してください。" 
      }, { status: 500 });
    }

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

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "newspaper_archive/pdfs",
          resource_type: "auto", // PDF, Image 自動判別
          pages: true // PDFの場合、ページ情報を保持
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    console.log(`[Upload API] Success: ${result.resource_type} uploaded.`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details: error.http_code === 401 ? "認証に失敗しました。API Key/Secretを確認してください。" : "アップロード中に障害が発生しました。"
    }, { status: 500 });
  }
}
