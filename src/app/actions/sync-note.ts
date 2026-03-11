'use server';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * 
 * 本物のnoteアカウント: https://note.com/lucky_minnow287
 * RSSフィードやAPIからデータを取得し、Firestoreに保存するロジックの基点です。
 */

export async function fetchNoteArticles() {
  // ネットワーク遅延のシミュレート
  await new Promise(resolve => setTimeout(resolve, 1500));

  const now = new Date().toISOString();
  const noteAccountUrl = "https://note.com/lucky_minnow287";

  // 本物の運用を想定した記事データのシミュレート
  return [
    {
      id: "note-lucky-001",
      title: "【note連動】北海学園大学一部新聞会デジタル版が本格始動",
      noteUrl: `${noteAccountUrl}/n/n123456789`,
      articleType: "Note",
      categoryId: "Campus",
      publishDate: now,
      mainImageUrl: "https://picsum.photos/seed/lucky1/600/400",
      isPublished: false,
      tags: ["lucky_minnow", "デジタル版"]
    },
    {
      id: "note-lucky-002",
      title: "編集長インタビュー：私たちのメディアが目指すもの",
      noteUrl: `${noteAccountUrl}/n/n987654321`,
      articleType: "Note",
      categoryId: "Interview",
      publishDate: now,
      mainImageUrl: "https://picsum.photos/seed/lucky2/600/400",
      isPublished: false,
      tags: ["lucky_minnow", "インタビュー"]
    }
  ];
}
