'use server';

/**
 * @fileOverview note記事同期のためのサーバーアクション
 * 
 * noteのRSSフィードやAPIからデータを取得するロジックの基点です。
 * ここで取得されるURLが管理画面や表示サイトに反映されます。
 */

export async function fetchNoteArticles() {
  // ネットワーク遅延のシミュレート
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 実際には note.com の RSS フィードを取得する処理をここに記述します
  const now = new Date().toISOString();

  return [
    {
      id: "note-2024-001",
      title: "【note連携】学内新聞のデジタル化への挑戦",
      noteUrl: "https://note.com/hokkai_shinbun/n/n123456789", // ここに設定されたURLが利用されます
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
      noteUrl: "https://note.com/hokkai_shinbun/n/n987654321", // ここに設定されたURLが利用されます
      articleType: "Note",
      categoryId: "Interview",
      publishDate: now,
      mainImageUrl: "https://picsum.photos/seed/note2/600/400",
      isPublished: false,
      tags: ["note", "座談会"]
    }
  ];
}
