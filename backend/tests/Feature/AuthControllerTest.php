<?php

namespace Tests\Feature;

use App\Services\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 名前が入力されていない場合バリデーションメッセージが表示される(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'firebase_uid' => 'test_uid_001',
            'name' => '',
            'email' => 'test@example.com',
            'password' => 'password123'
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'error' => 'バリデーションエラー'
        ]);
        $response->assertJsonPath('details.name.0', 'ユーザーネームを入力してください');
    }

    #[Test]
    public function メールアドレスが入力されていない場合バリデーションメッセージが表示される(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'firebase_uid' => 'test_uid_002',
            'name' => 'テストユーザー',
            'email' => '',
            'password' => 'password123'
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'error' => 'バリデーションエラー'
        ]);
        $response->assertJsonPath('details.email.0', 'メールアドレスを入力してください');
    }

    #[Test]
    public function パスワードが入力されていない場合バリデーションメッセージが表示される(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'firebase_uid' => 'test_uid_003',
            'name' => 'テストユーザー',
            'email' => 'test@example.com',
            'password' => ''
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'error' => 'バリデーションエラー'
        ]);
        $response->assertJsonPath('details.password.0', 'パスワードを入力してください');
    }

    #[Test]
    public function パスワードが6文字未満の場合バリデーションメッセージが表示される(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'firebase_uid' => 'test_uid_004',
            'name' => 'テストユーザー',
            'email' => 'test@example.com',
            'password' => '12345' // 5文字
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'error' => 'バリデーションエラー'
        ]);
        $response->assertJsonPath('details.password.0', '6文字以上で入力してください');
    }

    #[Test]
    public function 全ての項目が入力されている場合会員情報が登録される(): void
    {
        // AuthServiceをモックして、registerメソッドが成功レスポンスを返すようにする
        $mockAuthService = $this->createMock(AuthService::class);
        $mockAuthService->method('register')->willReturn([
            'success' => true,
            'user' => [
                'id' => 1,
                'firebase_uid' => 'test_uid_005',
                'name' => 'テストユーザー',
                'email' => 'test@example.com'
            ]
        ]);
        
        $this->app->instance(AuthService::class, $mockAuthService);

        $response = $this->postJson('/api/auth/register', [
            'firebase_uid' => 'test_uid_005',
            'name' => 'テストユーザー',
            'email' => 'test@example.com',
            'password' => 'password123'
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true
        ]);
    }
}
