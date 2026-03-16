
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * サーバー側で画像を Cloudinary へアップロードする API ルート
 * 署名エラー（Invalid Signature）を物理的に排除するため、最高司令官の鍵をダイレクトに接続します。
 */
export async function POST(request: Request) {
  try {
    // 【最高司令官（作成者様）へ】
    // 下記の api_secret の値を、Cloudinary 管理画面の「API Secret」に書き換えてください。
    // 目のアイコンをクリックして表示される文字列をコピー＆ペーストしてください。
    cloudinary.config({
      cloud_name: "dl2yqrpfj",
      api_key: "217388631115892",
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
    // 署名エラー回避のため、署名対象となるオプションを最小限に。
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
    // 詳細なエラー原因をフロントエンドへ返送
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      details: "API Secretが正しく入力されているか確認してください。"
    }, { status: 500 });
  }
}
