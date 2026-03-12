
'use server';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * 
 * 本物のnoteアカウント: https://note.com/lucky_minnow287
 */

export async function fetchNoteArticles() {
  // ネットワーク遅延のシミュレート
  await new Promise(resolve => setTimeout(resolve, 1000));

  const noteAccountUrl = "https://note.com/lucky_minnow287";

  // 本物の運用を想定した記事データの構成
  return [
    {
      id: "note-lucky-001",
      title: "【学園ニュース】北海学園大学一部新聞会デジタル版が本格始動しました",
      noteUrl: `${noteAccountUrl}/n/n123456789`,
      articleType: "Note",
      categoryId: "Campus",
      publishDate: new Date().toISOString(),
      mainImageUrl: "https://picsum.photos/seed/lucky1/800/450",
      isPublished: false,
      tags: ["新聞会", "デジタル版", "lucky_minnow"]
    },
    {
      id: "note-lucky-002",
      title: "編集長インタビュー：私たちのメディアが目指すものと北海学園の今",
      noteUrl: `${noteAccountUrl}/n/n987654321`,
      articleType: "Note",
      categoryId: "Interview",
      publishDate: new Date().toISOString(),
      mainImageUrl: "https://picsum.photos/seed/lucky2/800/450",
      isPublished: false,
      tags: ["インタビュー", "学生の力", "lucky_minnow"]
    }
  ];
}
