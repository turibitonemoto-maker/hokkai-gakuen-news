
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

/**
 * Cloudinary 資源物理抹消 API
 * URL を受け取り、Cloudinary上の実体を削除します。
 */
export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  try {
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary settings missing" }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: "URLs required" }, { status: 400 });
    }

    // URLからpublic_idを抽出する関数
    // 例: https://res.cloudinary.com/cloud/image/upload/v123/folder/name.jpg -> folder/name
    const results = await Promise.all(
      urls.map(async (url) => {
        if (!url || typeof url !== 'string') return null;
        try {
          const parts = url.split('/');
          const fileNameWithExt = parts.pop() || "";
          const fileName = fileNameWithExt.split('.')[0];
          
          // フォルダ階層が含まれている場合（upload/v123/ 移行のパーツを結合）
          const uploadIdx = parts.indexOf('upload');
          if (uploadIdx === -1) return null;
          
          // v123 のようなバージョン番号をスキップ
          const startIndex = parts[uploadIdx + 1]?.startsWith('v') ? uploadIdx + 2 : uploadIdx + 1;
          const publicId = [...parts.slice(startIndex), fileName].join('/');
          
          return await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.error("Delete error for URL:", url, e);
          return null;
        }
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Cloudinary Delete API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
