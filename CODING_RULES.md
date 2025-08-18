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

### 4. 変数命名ルール
- **1文字など極端に短い変数名は使用禁止**
- Laravelにおける例外変数の `$e` は許容
- JavaScriptにおけるイベント引数の `e` は許容

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