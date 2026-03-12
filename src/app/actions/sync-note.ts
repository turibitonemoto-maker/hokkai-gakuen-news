'use server';

import Parser from 'rss-parser';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * * Vercelの環境変数 NEXT_PUBLIC_NOTE_RSS_URL を使用します
 */

const parser = new Parser();

export async function fetchNoteArticles() {
  // Vercelから設定したRSS URLを取得
  const NOTE_RSS_URL = process.env.NEXT_PUBLIC_NOTE_RSS_URL;

  if (!NOTE_RSS_URL) {
    console.error("Error: NEXT_PUBLIC_NOTE_RSS_URL is not defined in environment variables.");
    return [];
  }

  try {
    // noteのRSSを解析して記事を取得
    const feed = await parser.parseURL(NOTE_RSS_URL);

    return feed.items.map((item, index) => {
      return {
        // IDは重複しないようにguidかlinkを使用
        id: item.guid || `note-${index}`,
        title: item.title || "無題の記事",
        noteUrl: item.link,
        articleType: "Note",
        // カテゴリや画像はRSSからは取れないためデフォルト値を設定
        categoryId: "Campus",
        publishDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        mainImageUrl: "https://picsum.photos/seed/note/800/450", // 仮の画像
        isPublished: false,
        tags: ["note"]
      };
    });
  } catch (error) {
    console.error("Failed to fetch real note articles:", error);
    // 失敗した場合は空の配列を返す
    return [];
  }
}