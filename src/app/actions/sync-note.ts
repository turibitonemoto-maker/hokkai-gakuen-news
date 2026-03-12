'use server';

import Parser from 'rss-parser';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * アカウント: https://note.com/lucky_minnow287
 */

const parser = new Parser();

export async function fetchNoteArticles() {
  // 本物のアカウントのRSS URL
  const NOTE_RSS_URL = "https://note.com/lucky_minnow287/rss";

  try {
    const feed = await parser.parseURL(NOTE_RSS_URL);

    return feed.items.map((item, index) => {
      // 本物の画像URLを取得するロジック（RSSに画像が含まれない場合はPicsumを使用）
      const firstImage = item.content?.match(/<img[^>]+src="([^">]+)"/)?.[1] || `https://picsum.photos/seed/note-${index}/800/450`;

      return {
        id: item.guid || `note-${index}`,
        title: item.title || "無題の記事",
        noteUrl: item.link,
        articleType: "Note",
        categoryId: "Campus",
        publishDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        mainImageUrl: firstImage,
        isPublished: false,
        tags: ["note"]
      };
    });
  } catch (error) {
    console.error("Failed to fetch real note articles:", error);
    return [];
  }
}
