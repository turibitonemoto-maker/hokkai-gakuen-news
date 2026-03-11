
'use server';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * 
 * 本来は note.com の RSS フィードや API からデータを取得しますが、
 * ここではプロトタイプ用にシミュレーションデータを返します。
 */

export async function fetchNoteArticles() {
  // ネットワーク遅延のシミュレート
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 本来は fetch("https://note.com/YOUR_ID/rss") などを行う
  // 日付はISO形式の文字列で統一します
  const now = new Date().toISOString();

  return [
    {
      id: "note-2024-001",
      title: "【note連携】学内新聞のデジタル化への挑戦",
      noteUrl: "https://note.com/hokkai_shinbun/n/n123456789",
      articleType: "Note",
      categoryId: "Column",
      publishDate: now,
      mainImageUrl: "https://picsum.photos/seed/note1/600/400",
      isPublished: false,
      tags: ["note", "デジタル"]
    },
    {
      id: "note-2024-002",
      title: "【note連携】編集部メンバーによる座談会：新聞会の未来",
      noteUrl: "https://note.com/hokkai_shinbun/n/n987654321",
      articleType: "Note",
      categoryId: "Interview",
      publishDate: now,
      mainImageUrl: "https://picsum.photos/seed/note2/600/400",
      isPublished: false,
      tags: ["note", "座談会"]
    }
  ];
}
