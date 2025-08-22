<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CommentControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 投稿に紐付くコメント一覧を取得でき本文と投稿者名が表示される(): void
    {
        // 準備：ユーザー、投稿、コメントを作成
        $expectedUserName = 'テストユーザー太郎';
        $expectedCommentBody = 'これはテスト用のコメント本文です';
        $testUser = User::factory()->create([
            'name' => $expectedUserName
        ]);
        $testPost = Post::factory()->for($testUser)->create();
        
        // 複数のコメントを作成（1つは特定の内容、残りはランダム）
        Comment::factory()->for($testPost)->for($testUser)->create([
            'body' => $expectedCommentBody
        ]);
        Comment::factory()->count(2)->for($testPost)->for($testUser)->create();
        $expectedCommentsCount = 3;

        // 実行：コメント一覧取得APIを呼び出し
        $actual = $this->getJson("/api/posts/{$testPost->id}/comments");

        // 検証：レスポンス構造、コメント数、本文、投稿者名をまとめて確認
        $actual->assertStatus(200);
        $actual->assertJsonStructure([
            'success',
            'comments' => [
                '*' => [
                    'id',
                    'body',
                    'user' => [
                        'id',
                        'name'
                    ]
                ]
            ],
            'pagination'
        ]);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonCount($expectedCommentsCount, 'comments');
        $actual->assertJsonPath('comments.0.body', $expectedCommentBody);
        $actual->assertJsonPath('comments.0.user.name', $expectedUserName);
    }
}
