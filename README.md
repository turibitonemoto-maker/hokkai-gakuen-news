
# 北海学園大学一部新聞会 管制システム (CMS)

このプロジェクトは、北海学園大学一部新聞会の公式ニュース配信における**管理・制御用（CMS）サイト**です。
記者が紡ぐ言葉をデジタル空間に安全かつ美しく送り出し、サイト全体の稼働状況を中央制御することを目的としています。

## プロジェクトの役割

- **コンテンツ・マネジメント (CMS)**: 記事の執筆、編集、公開スイッチの制御。Tiptapエディタによる「note風」の執筆体験を提供。
- **聖典（Sacred Scripture）の遵守**: 全てのテキストデータは `content` フィールド（HTML形式）で統一管理。
- **会長挨拶の統制**: サイトの顔である会長メッセージを、記事と同様のリッチエディタで管理。DocID: `president_greeting`, Field: `content` を厳守。
- **画像・広告管理**: Firebase Storageと連携し、手入力不要の自動アップロード機能（配送センター）を完備。
- **サイト・コントロール**: メンテナンスモードの切り替え、緊急メッセージの配信。

## 現在の進捗状況 (2025/03)

- [x] **文字更新の完全同期**: 会長挨拶および記事の `content` フィールド同期に成功。
- [x] **日本仕様の黄金比**: 行間 `leading-7` (約1.6倍) および段落余白を全域で適用済み。
- [x] **自動配送センター (Storage) 稼働**: 画像の自動アップロード機能を記事・ヒーロー・広告の全域に実装完了。

## 接続・プレビュー情報

### 📡 開発・テスト用 (Firebase Studio)
- **管理用サイト (ログイン)**: [https://6000-firebase-studio-1773136574841.cluster-y75up3teuvc62qmnwys4deqv6y.cloudworkstations.dev/admin](https://6000-firebase-studio-1773136574841.cluster-y75up3teuvc62qmnwys4deqv6y.cloudworkstations.dev/admin)
- **表示用サイト (参照用)**: [https://6000-firebase-studio-1771906628521.cluster-osvg2nzmmzhzqqjio6oojllbg4.cloudworkstations.dev/](https://6000-firebase-studio-1771906628521.cluster-osvg2nzmmzhzqqjio6oojllbg4.cloudworkstations.dev/)

---
© 2025 北海学園大学一部新聞会 / COMMANDING FOR THE FUTURE
