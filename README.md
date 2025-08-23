# アプリケーション名

SNS アプリ

-----

# セットアップ手順

-----

## セットアップ

### 1. リポジトリのクローン

まず、プロジェクトのリポジトリをローカルにクローンし、ディレクトリに移動します。

```bash
git clone git@github.com:matsuoka1985/sns-app.git
cd sns-app
```

### 2. Dockerコンテナの起動

```bash
docker compose up -d --build
```

### 3. PHPコンテナへアクセス

PHPコンテナのシェルに入るには、以下のコマンドを使用します。

```bash
docker compose exec php bash
```

### 4. 初期セットアップ

phpコンテナにログインした状態において以下のコマンドを実行することでcomposer installによるvendorディレクトリの作成、.envファイルの作成、APP_KEYの生成、マイグレーション、シーディングが一括で実行できます。

```bash
# Composerパッケージのインストール
composer install

# 環境設定ファイルをコピー
cp .env.example .env

# アプリケーションキーを生成
php artisan key:generate

# データベースマイグレーションとシーディングを実行
php artisan migrate --seed
```

### 5. フロントエンド（Nuxt.js）のセットアップ

```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

-----

## テスト

### 1. PHPUnitテスト（Laravel）の実行

```bash
# PHPコンテナ内で実行
docker compose exec php php artisan test
```

### 2. Vitestテスト（Nuxt.js）の実行

```bash
# フロントエンドディレクトリで実行
cd frontend
npm run test
```

-----

## アクセス情報

全てのコンテナが起動し、アプリケーションのセットアップが完了すると、以下のURLで各サービスにアクセスできます。

* **Nuxt.js フロントエンド**: [http://localhost:3000](http://localhost:3000)
* **Laravel API**: [http://localhost:80](http://localhost:80)
* **MailHog (開発用メール UI)**: [http://localhost:8025](http://localhost:8025)
* **phpMyAdmin (データベース管理GUIツール UI)**: [http://localhost:8080](http://localhost:8080)
* **Redis**: localhost:6379

### テスト用アカウント情報

以下の認証データによってテストアカウントでログインできます：

- メールアドレス: `test@example.com`
- パスワード: `password`

---

## 使用技術(実行環境)

### バックエンド
* PHP 8.2
* Laravel 11
* MySQL 8.0.37
* Redis 7.0.11
* nginx 1.21.1

### フロントエンド
* Nuxt.js 3
* Vue.js 3
* TypeScript

### その他
* Firebase Authentication
* Vitest (フロントエンドテスト)
* PHPUnit (バックエンドテスト)

---

## 機能一覧

1. **ユーザー認証**
   - ユーザー登録
   - ログイン・ログアウト
   - Firebase Authentication連携

2. **投稿機能**
   - 投稿作成・編集・削除
   - 投稿一覧表示
   - 投稿詳細表示

3. **いいね機能**
   - いいね・いいね解除
   - いいね数表示

4. **コメント機能**
   - コメント投稿
   - コメント一覧表示

---

## API仕様

### 認証
- `POST /api/register` - ユーザー登録
- `POST /api/login` - ログイン
- `POST /api/logout` - ログアウト

### 投稿
- `GET /api/posts` - 投稿一覧取得
- `POST /api/posts` - 投稿作成
- `GET /api/posts/{id}` - 投稿詳細取得
- `DELETE /api/posts/{id}` - 投稿削除
- `POST /api/posts/{id}/restore` - 投稿復元

### いいね
- `POST /api/posts/{id}/like` - いいね追加・削除

### コメント
- `GET /api/posts/{id}/comments` - コメント一覧取得
- `POST /api/posts/{id}/comments` - コメント作成

---

## ディレクトリ構成

```
sns-app/
├── backend/                 # Laravel API
│   ├── app/
│   ├── database/
│   ├── tests/
│   └── ...
├── frontend/                # Nuxt.js フロントエンド
│   ├── components/
│   ├── pages/
│   ├── composables/
│   ├── tests/
│   └── ...
├── docker/                  # Docker設定
│   ├── php/
│   ├── nginx/
│   ├── mysql/
│   └── ...
├── docker-compose.yml
└── README.md
```
