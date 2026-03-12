import DisplaySite from "./site/page";

/**
 * ルートページを表示用サイト（フロントエンド）に変更しました。
 * 管理画面は /admin に集約されています。
 */
export default function Home() {
  return <DisplaySite />;
}