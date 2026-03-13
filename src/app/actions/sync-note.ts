'use server';

import Parser from 'rss-parser';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * 実運用アカウント: https://note.com/lucky_minnow287
 */

const parser = new Parser();

export async function fetchNoteArticles() {
  const NOTE_RSS_URL = "https://note.com/lucky_minnow287/rss";

  try {
    const feed = await parser.parseURL(NOTE_RSS_URL);

    return feed.items.map((item, index) => {
      // noteのRSSから画像URLを抽出（より広範なパターンに対応）
      // content (content:encoded) または description の中から img タグを探す
      const searchTarget = (item['content:encoded'] || item.content || item.description || "");
      
      // 画像抽出の試行
      // 1. 通常の src 属性
      // 2. note特有の data-src や他の属性
      // 3. st-note.com (noteの画像サーバー) のURLを優先的に探す
      let firstImage = "";
      
      const imageMatch = searchTarget.match(/<img[^>]+src=["']([^"'>]+)["']/i);
      if (imageMatch) {
        firstImage = imageMatch[1];
      }

      // もし src が取得できなかった、あるいは note の CDN 以外の画像だった場合、
      // 属性をさらに深掘り（noteのRSSは時々特殊な構造になるため）
      if (!firstImage || !firstImage.includes('st-note.com')) {
        const anyImgMatch = searchTarget.match(/https:\/\/assets\.st-note\.com\/[^"'\s>]+/i);
        if (anyImgMatch) {
          firstImage = anyImgMatch[0];
        }
      }

      // リンクからnote固有のIDを抽出
      const guid = item.guid || item.link || "";
      const noteIdMatch = guid.match(/\/n\/([a-zA-Z0-9]+)/);
      const safeId = noteIdMatch ? noteIdMatch[1] : (guid.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '_') || `note-${index}`);

      // 日付を YYYY-MM-DD 形式に変換
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const formattedDate = pubDate.toISOString().split('T')[0];

      // 本文のスニペットを取得
      const snippet = (item.contentSnippet || item.content || item.description || "")
        .replace(/<[^>]*>/g, '') // HTMLタグ除去
        .substring(0, 300);

      return {
        id: safeId,
        title: item.title || "無題の記事",
        noteUrl: item.link,
        articleType: "Note",
        categoryId: "Campus",
        publishDate: formattedDate,
        mainImageUrl: firstImage, // 見つからない場合は空文字
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
