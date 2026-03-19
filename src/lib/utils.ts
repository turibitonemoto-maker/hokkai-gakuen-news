import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * HTML文字列からCloudinaryの画像URLをすべて抽出する
 */
export function extractCloudinaryUrls(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  // CloudinaryのURLパターンにマッチさせる正規表現
  const regex = /https:\/\/res\.cloudinary\.com\/[^"'\s>]+/g;
  const matches = html.match(regex);
  if (matches) {
    matches.forEach(url => {
      // 重複排除して追加
      if (!urls.includes(url)) urls.push(url);
    });
  }
  return urls;
}
