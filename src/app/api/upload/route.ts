
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * フォルダ指定対応アップロード API
 * FormData に 'folder' フィールドを含めることで、Cloudinary上の保存先を物理的に整理します。
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
    const folder = (formData.get("folder") as string) || "newspaper_archive/misc";

    if (!file) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 診断ログ
    console.log(`[Upload API] TARGET_CLOUD_NAME: ${cloudName}, FOLDER: ${folder}`);

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folder,
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
    console.error("Upload API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details: "アップロード中に障害が発生しました。クラウド名や権限を確認してください。"
    }, { status: 500 });
  }
}
