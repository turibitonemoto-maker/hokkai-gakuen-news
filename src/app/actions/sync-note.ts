'use server';

import Parser from 'rss-parser';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * RSSからリッチコンテンツ(content:encoded)を解析し、画像を抽出します。
 */

const parser = new Parser();

export async function fetchNoteArticles() {
  const NOTE_RSS_URL = "https://note.com/lucky_minnow287/rss";

  try {
    const feed = await parser.parseURL(NOTE_RSS_URL);

    return feed.items.map((item, index) => {
      // 抽出対象の文字列を結合
      const searchTarget = (
        (item as any)['content:encoded'] || 
        item.content || 
        item.description || 
        ""
      );
      
      let firstImage = "";
      
      // 1. noteの画像サーバー(st-note.com)のURLを直接探す（これが最も確実）
      const anyImgMatch = searchTarget.match(/https:\/\/assets\.st-note\.com\/[^"'\s>]+/i);
      if (anyImgMatch) {
        firstImage = anyImgMatch[0];
      }

      // 2. もし見つからなければ、imgタグのsrc属性を探す
      if (!firstImage) {
        const imageMatch = searchTarget.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        if (imageMatch) {
          firstImage = imageMatch[1];
        }
      }

      // 記事IDの抽出
      const guid = item.guid || item.link || "";
      const noteIdMatch = guid.match(/\/n\/([a-zA-Z0-9]+)/);
      const safeId = noteIdMatch ? noteIdMatch[1] : (guid.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '_') || `note-${index}`);

      // 日付の整形
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const formattedDate = pubDate.toISOString().split('T')[0];

      // スニペットの作成
      const snippet = (item.contentSnippet || item.content || item.description || "")
        .replace(/<[^>]*>/g, '') 
        .substring(0, 300);

      return {
        id: safeId,
        title: item.title || "無題の記事",
        noteUrl: item.link,
        articleType: "Note",
        categoryId: "Campus",
        publishDate: formattedDate,
        mainImageUrl: firstImage, // 見つからない場合は空文字（ランダム画像は入れない）
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
