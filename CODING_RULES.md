# コーディング規約

## TypeScript/JavaScript 必須ルール

### 1. 関数記述ルール
- **アロー関数は必ずブロック`{}`使用** (省略禁止)
- **return文省略禁止** (明示的にreturnを記述)
- **if文は必ずブロック`{}`使用** (1行でも省略禁止)
- **文末セミコロン`;`必須**

### 2. ログ出力ルール
- **console.log/errorでの絵文字使用禁止**
- シンプルなテキストログのみ使用

### 3. 型安全性ルール
- **オブジェクトプロパティアクセス時は必ず型ガード実装**
- `unknown`型は適切な型チェック後にアクセス
- 型アサーションより型ガードを優先
- **TypeScriptではやむを得ない場合を除き `any` 型の使用を禁止**（必ず適切な型を定義すること）
- **TypeScriptにおいて、やむを得ない場合を除き Non-null assertion operator（`!`）の使用を禁止**（乱用せず適切な型定義やガードで対応すること）

### 4. 変数命名ルール
- **1文字など極端に短い変数名は使用禁止**
- Laravelにおける例外変数の `$e` は許容
- JavaScriptにおけるイベント引数の `e` は許容
- **基本的に変数名の略語は禁止**（1文字変数や中途半端な省略は不可）
- **よほど一般的に浸透している略語のみ許容**（例: jwt, db など）
- **ループ変数も対象の単数形を使うこと**（例: `posts` を回すなら `post`）
- **index を idx などに省略するのも禁止**
- **（テストコードの命名）関数/メソッドの引数として渡すテスト入力値のみ `inputXxx` を用いる**（例: `inputPayload`, `inputId`）。**エンティティのテストデータは自然な名前**（例: `user`, `item`, `post`）を用いる。

## PHP / PHPUnit 必須ルール

### 1. テスト記述ルール
- **属性ベースのテスト定義を必須**
  `use PHPUnit\Framework\Attributes\Test;` を宣言し、各テストメソッドに **`#[Test]` を付与**。
- **テストメソッド名は日本語の自然文で記述してよい（推奨）**
  例: `public function 有効なペイロードならユーザを作成する(): void`
- **`TestDox` は使用しない**（日本語名はメソッド名で表現）
- **`@test` アノテや `test*` メソッド名による定義は禁止**（移行期間の既存コードは例外）
- **テストクラス名は `Test` サフィックス必須**
- **各テストは少なくとも1つ以上のアサーションを含む**
- **テストメソッドは一度に複数まとめて書かず、必ず1つずつ追加すること**
  - 各テストが通ったことを確認してから次のテストを書く。
  - 一気に複数のテストを書いて失敗を積み重ねると混乱しやすいため。
- **テストを記述する際は冗長であっても以下のスタイルに従うこと**
  - 入力値、予想される値、実際の値をそれぞれ変数として宣言しておく。
  - 予想される値には `expected`、実際の値には `actual` を変数名として使用することを基本とする。
  - 入力値は `input` 系の名前（例: `inputA`, `inputPayload` など）を用いること。
  - これによりテストの可読性とレビュー時の理解が容易になる。

#### ✅ 良い例（PHPUnit）
```php
<?php

use PHPUnit\Framework\Attributes\Test;

final class UserServiceTest extends TestCase
{
    #[Test]
    public function 有効なペイロードならユーザを作成する(): void
    {
        // arrange / act / assert
        $this->assertTrue(true);
    }
}
```

#### ❌ 悪い例（PHPUnit）
```php
<?php

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox; // 本規約では使用禁止

final class UserServiceTest extends TestCase
{
    /** @test */ // 本規約では禁止
    public function it_creates_user_with_valid_payload(): void
    {
        $this->assertTrue(true);
    }

    public function testCreatesUserWithValidPayload(): void // 本規約では禁止
    {
        $this->assertTrue(true);
    }

    #[Test]
    #[TestDox('有効なペイロードならユーザを作成する')] // 本規約では禁止
    public function creates_user_with_valid_payload(): void
    {
        $this->assertTrue(true);
    }
}
```

## PHP / Laravel コードスタイル

### 2. 変数命名ルール
- **1文字など極端に短い変数名は使用禁止**
- Laravelにおける例外変数の `$e` は許容
- **基本的に変数名の略語は禁止**（1文字変数や中途半端な省略は不可）
- **よほど一般的に浸透している略語のみ許容**（例: jwt, db など）
- **ループ変数も対象の単数形を使うこと**（例: `posts` を回すなら `post`）
- **index を idx などに省略するのも禁止**
- **（テストコードの命名）関数/メソッドの引数として渡すテスト入力値のみ `inputXxx` を用いる**（例: `inputPayload`, `inputId`）。**モデル/エンティティのテストデータは自然な名前**（例: `user`, `item`, `post`）を用いる。

### 1. use 宣言ルール
- **FQCN（完全修飾クラス名）の直書き禁止**。クラス/インタフェース/トレイト/Facade 等は**ファイル冒頭で `use` を宣言して短い名前で参照**。
- **同名衝突がある場合は `as` で別名付与**。
- **`use` の並びはアルファベット順**。未使用の `use` は削除。
- **グローバル関数に FQCN を使わない**（`\strlen` ではなく `strlen`）。
- 例外: **設定や配列での `::class` 指定、PHPUnit の Attribute など**はこの限りでない。

#### ✅ 良い例（Laravel / use を宣言）
```php
<?php

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

$now = Carbon::now();
Log::info('処理開始');
return Response::HTTP_OK;
```

#### ❌ 悪い例（FQCNの直書き）
```php
<?php

$now = \Illuminate\Support\Carbon::now();
\Illuminate\Support\Facades\Log::info('処理開始');
return \Symfony\Component\HttpFoundation\Response::HTTP_OK;
```

### 3. ファイル生成ルール（artisan 必須）
- **artisan で生成できるファイルは手作業で新規作成しない**。
  - 例：モデル、コントローラ、マイグレーション、テスト、シーダ、ファクトリ、FormRequest、Policy、Event/Listener、Job、Resource、Rule、Middleware など。
- **必ず artisan コマンドで生成**し、用意されたスタブと適切な名前空間・配置を利用すること。
- 生成後に必要な `use` の追加や、命名・責務の見直しを行う（規約に準拠）。

#### ✅ 良い例（コマンドで生成）
```bash
php artisan make:model Post -mf
php artisan make:controller PostController --invokable
php artisan make:migration create_posts_table
php artisan make:test PostControllerTest
php artisan make:request StorePostRequest
```

#### ❌ 悪い例（手作業で空ファイル作成）
```
app/Models/Post.php を手で作る
app/Http/Controllers/PostController.php を手で作る
database/migrations/2025_08_20_000000_create_posts_table.php を手で作る
```

> メリット：スタブにより基本構造・名前空間・配置が保証され、初期ミス（PSR-4違反、名前空間誤り、ベースクラス未継承など）を防げる。

### 4. DBカラム名との統一ルール
- **docs/dbdiagram.dbml や Laravel のマイグレーションファイルを参照すれば DB のテーブル構造やカラム名が確認できる**。
- **View ファイルやフロントエンドで DB から渡ってきたデータを格納する変数名は、基本的に DB のカラム名と統一すること**。
- よほど他の変数名と衝突するなどの事情がない限り、カラム名と異なる変数名を使わない。
- これによりフロント/バック間での変数名不一致による混乱を防ぎ、メンテ性を高める。

### 5. 外部通信ルール
- **外部通信時は必ず `docker-compose.yml` を参照してホスト名を利用すること**
- `http://localhost` などのベタ書きは禁止。本番環境では動作しないため。
- 通信先は環境変数や設定ファイルで管理し、環境ごとに切り替えられるようにすること。
- これにより開発・ステージング・本番の切り替えが容易になり、設定忘れによる不具合を防ぐ。

## 規約の適用・遵守

- すべての修正・新規実装は本規約に**必ず準拠**すること。
- 既存コードに規約違反がある場合、関連箇所を変更する際は**周辺の違反も同時に是正**すること（ボーイスカウト・ルール）。
- レビューで規約外の判断が必要になった場合は、このファイルを更新して合意を明文化してから実装に反映すること。

## 良い例・悪い例（JS）

### ✅ 良い例
```typescript
// アロー関数
const handler = (data: any) => {
  if (data && typeof data === 'object' && 'name' in data) {
    return data.name;
  }
  return null;
};

// if文
if (condition) {
  doSomething();
}

// 型ガード
if (response && typeof response === 'object' && 'likes_count' in response) {
  return response.likes_count;
}
```

### ❌ 悪い例
```typescript
// ブロック省略
const handler = data => data?.name

// if文省略
if (condition) doSomething()

// セミコロン省略
const value = getData()

// 絵文字使用
console.log('🔥 処理開始')

// 型ガードなし
return response.likes_count; // responseがunknown型
```

## 適用方法
全てのコード修正・新規実装時にこの規約を適用してください。