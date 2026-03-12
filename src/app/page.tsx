import { redirect } from "next/navigation";

/**
 * ルートページ（/）にアクセスした場合、即座に管理画面（/admin）へリダイレクトします。
 * 公開用の表示サイトは廃止されました。
 */
export default function Home() {
  redirect("/admin");
}