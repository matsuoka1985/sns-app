<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;

class TestCommentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 特定の投稿ID（存在する投稿の最初のIDを取得）
        $targetPost = Post::first();
        
        if (!$targetPost) {
            $this->command->info('投稿が見つかりません。先にPostSeederを実行してください。');
            return;
        }

        $users = User::all();
        
        if ($users->isEmpty()) {
            $this->command->info('ユーザーが見つかりません。先にUserSeederを実行してください。');
            return;
        }

        $this->command->info("投稿ID {$targetPost->id} に100件のコメントを作成中...");

        // 特定の投稿に100件のコメントを作成
        Comment::factory(100)->create([
            'post_id' => $targetPost->id,
            'user_id' => function () use ($users) {
                return $users->random()->id;
            }
        ]);

        $this->command->info("✅ 投稿ID {$targetPost->id} に100件のコメントを作成しました！");
        $this->command->info("🔗 テスト用URL: http://localhost:3000/posts/{$targetPost->id}");
    }
}