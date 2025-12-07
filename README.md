# TAIKAN - 体育館個人開放検索アプリ

個人開放している体育館を簡単に検索できるWebアプリケーション

## 📋 概要

**課題**: 個人開放している体育館を調べるのが大変

**ペルソナ**: バドミントン、卓球、バスケ、室内テニス、バレー、ゲートボールを趣味にしている社会人

## 🛠️ 技術スタック

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Chakra UI v2
- **Backend**: Firebase v9+ (Modular SDK)
- **State Management**: React Context + Hooks

## 📁 プロジェクト構造

```
taikan/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # メインページ
│   ├── providers.tsx      # Chakra UIプロバイダー
│   └── globals.css        # グローバルスタイル
├── components/
│   ├── ui/                # 再利用可能なUIコンポーネント
│   │   ├── Badge.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Modal.tsx
│   │   └── SearchField.tsx
│   └── features/          # ビジネスロジック付きコンポーネント
│       ├── GymCard.tsx
│       ├── TopScreen.tsx
│       ├── ListScreen.tsx
│       ├── DetailScreen.tsx
│       ├── LocationModalContent.tsx
│       ├── DateModalContent.tsx
│       └── SportModalContent.tsx
├── lib/
│   └── firebase/          # Firebase設定とAPI
│       ├── config.ts      # Firebase初期化（エミュレーター対応）
│       └── api.ts         # Firestore APIラッパー
├── hooks/                 # カスタムReact Hooks
│   ├── useGyms.ts
│   └── useMockData.ts
├── types/                 # TypeScript型定義
│   └── index.ts
└── public/                # 静的ファイル
```

## 🚀 セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example` を `.env.local` にコピーして、Firebase設定を追加：

```bash
cp .env.local.example .env.local
```

`.env.local` を編集してFirebaseプロジェクトの認証情報を設定してください。

### 3. Firebaseエミュレーターのセットアップ

開発環境ではFirebaseエミュレーターを使用します。

```bash
# Firebase CLIをグローバルインストール（未インストールの場合）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# エミュレーターを起動
npm run firebase:emulators
```

エミュレーターUI: http://localhost:4000

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 🏗️ 主要機能

### 検索機能
- キーワード検索
- エリア・駅・現在地による絞り込み
- 日時指定
- 競技種目選択

### 一覧表示
- リスト表示
- カレンダー表示
- リアルタイム空き状況

### 詳細画面
- 施設詳細情報
- 時間別空き状況
- アクセス情報
- 利用制限・注意事項

## 🎨 デザイン原則

- **ミニマル & スタイリッシュ**: シンプルで使いやすいUI
- **レスポンシブ**: モバイルファーストデザイン
- **アクセシビリティ**: WCAG準拠を目指した設計

## 📚 アーキテクチャ規則

### 1. Next.js App Router & Chakra UI統合
- `providers.tsx`で`use client`ディレクティブを使用
- ルート`layout.tsx`はServer Componentとして維持

### 2. Firebase初期化（シングルトンパターン）
- HMR対応のため`getApps().length`チェック
- Modular SDK使用（Compat SDKは使用しない）

### 3. エミュレーター接続
- 開発環境のみ自動接続
- 二重接続エラー防止ロジック実装

### 4. ロジック分離
- UIコンポーネント内でFirebaseクエリを直接実行しない
- カスタムフックまたはサービス関数を使用

## 🧪 開発ワークフロー

1. **コンポーネント開発**: `components/`でUIとロジックを分離
2. **状態管理**: カスタムフックで抽象化
3. **Firebase連携**: `lib/firebase/api.ts`でAPI呼び出しを管理
4. **型安全性**: `types/index.ts`で一元管理

## 📦 ビルド

```bash
npm run build
npm start
```

## 🔧 トラブルシューティング

### Firebase App already initialized エラー
- HMR時の既知の問題
- `lib/firebase/config.ts`で適切にハンドリング済み

### エミュレーター接続エラー
- ポートが使用中でないか確認
- `firebase emulators:start`を再起動

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 ライセンス

MIT

## 👥 作成者

TAIKAN開発チーム

