
'use server';

import Parser from 'rss-parser';
import { getPlaceholderById } from '@/app/lib/placeholder-images';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * 実運用アカウント: https://note.com/lucky_minnow287
 */

const parser = new Parser();

export async function fetchNoteArticles() {
  const NOTE_RSS_URL = "https://note.com/lucky_minnow287/rss";
  const notePlaceholder = getPlaceholderById('note-default');

  try {
    const feed = await parser.parseURL(NOTE_RSS_URL);

    return feed.items.map((item, index) => {
      // noteのRSSから画像URLを抽出
      const firstImage = item.content?.match(/<img[^>]+src="([^">]+)"/)?.[1] || notePlaceholder.imageUrl;

      // リンクからnote固有のIDを抽出（ドキュメントIDとして安全な形式にする）
      const guid = item.guid || item.link || "";
      const noteIdMatch = guid.match(/\/n\/([a-zA-Z0-9]+)/);
      const safeId = noteIdMatch ? noteIdMatch[1] : (guid.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '_') || `note-${index}`);

      // 日付を YYYY-MM-DD 形式に変換
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const formattedDate = pubDate.toISOString().split('T')[0];

      return {
        id: safeId,
        title: item.title || "無題の記事",
        noteUrl: item.link,
        articleType: "Note",
        categoryId: "Campus",
        publishDate: formattedDate,
        mainImageUrl: firstImage,
        isPublished: false,
        tags: ["note"]
      };
    });
  } catch (error) {
    console.error("Failed to fetch note articles:", error);
    return [];
  }
}
