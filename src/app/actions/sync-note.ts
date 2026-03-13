'use server';

import Parser from 'rss-parser';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * RSSからリッチコンテンツを解析し、アイキャッチ画像を確実に抽出します。
 * また、HTML構造を解析して改行を保持したテキストを生成します。
 */

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

export async function fetchNoteArticles() {
  const NOTE_RSS_URL = "https://note.com/lucky_minnow287/rss";

  try {
    const feed = await parser.parseURL(NOTE_RSS_URL);

    return feed.items.map((item: any, index: number) => {
      // 1. 画像の抽出（複数の可能性を探索）
      let firstImage = "";
      
      // 可能性1: content:encoded 内の画像タグ
      const contentEncoded = item.contentEncoded || "";
      const anyImgMatch = contentEncoded.match(/https:\/\/assets\.st-note\.com\/[^"'\s>]+/i);
      if (anyImgMatch) {
        firstImage = anyImgMatch[0].replace(/&amp;/g, '&');
      }

      // 可能性2: media:content (rss-parserのカスタムフィールド)
      if (!firstImage && item.mediaContent && item.mediaContent.length > 0) {
        firstImage = item.mediaContent[0].$.url;
      }

      // 可能性3: enclosure
      if (!firstImage && item.enclosure && item.enclosure.url) {
        firstImage = item.enclosure.url;
      }

      // 2. 記事IDの抽出（URLから一意の識別子を取得）
      const guid = item.guid || item.link || "";
      const noteIdMatch = guid.match(/\/n\/([a-zA-Z0-9]+)/);
      const safeId = noteIdMatch ? noteIdMatch[1] : (guid.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '_') || `note-${index}`);

      // 3. 日付の整形
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const formattedDate = pubDate.toISOString().split('T')[0];

      // 4. 本文の整形（改行を維持しながらHTMLを除去）
      const rawContent = item.contentEncoded || item.content || item.description || "";
      const snippet = rawContent
        .replace(/<\/p>|<\/div>|<br\s*\/?>/gi, '\n') // ブロック要素と改行タグを改行文字に置換
        .replace(/<[^>]*>/g, '') // 残りのHTMLタグを削除
        .trim()
        .substring(0, 1000); // 概要として十分な長さを確保

      return {
        id: safeId,
        title: item.title || "無題の記事",
        noteUrl: item.link,
        articleType: "Note",
        categoryId: "Campus",
        publishDate: formattedDate,
        mainImageUrl: firstImage,
        isPublished: false,
        content: snippet,
        tags: ["note"]
      };
    });
  } catch (error) {
    console.error("Failed to fetch note articles:", error);
    return [];
  }
}
