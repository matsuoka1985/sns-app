<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Like;
use App\Models\Post;
use App\Models\User;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth;
use Exception;

class LikeController extends Controller
{
    private Auth $firebaseAuth;

    public function __construct()
    {
        // Firebase Admin SDK の初期化
        $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
        $this->firebaseAuth = $factory->createAuth();
    }

    /**
     * 投稿にいいねを追加
     */
    public function store(Request $request, $postId)
    {
        try {
            // JWTから認証情報を取得
            $jwt = $request->cookie('auth_jwt');
            
            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            // Firebase Admin SDK でJWT検証
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');

            // Firebase UIDからユーザーIDを取得
            $user = User::where('firebase_uid', $firebaseUid)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'ユーザーが見つかりません'
                ], 404);
            }

            // 投稿の存在確認
            $post = Post::find($postId);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'error' => '投稿が見つかりません'
                ], 404);
            }

            // 既にいいねしているかチェック
            $existingLike = Like::where('user_id', $user->id)
                                ->where('post_id', $postId)
                                ->first();

            if ($existingLike) {
                return response()->json([
                    'success' => false,
                    'error' => '既にいいねしています'
                ], 409);
            }

            // いいねを作成
            $like = Like::create([
                'user_id' => $user->id,
                'post_id' => $postId,
            ]);

            // 現在のいいね数を取得
            $likesCount = Like::where('post_id', $postId)->count();

            \Log::info('いいね作成成功', [
                'like_id' => $like->id,
                'user_id' => $user->id,
                'post_id' => $postId,
                'likes_count' => $likesCount
            ]);

            return response()->json([
                'success' => true,
                'message' => 'いいねしました',
                'likes_count' => $likesCount
            ], 201);

        } catch (Exception $e) {
            \Log::error('いいね作成エラー', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'いいねの作成に失敗しました'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * 投稿のいいねを解除
     */
    public function destroy(Request $request, $postId)
    {
        try {
            // JWTから認証情報を取得
            $jwt = $request->cookie('auth_jwt');
            
            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            // Firebase Admin SDK でJWT検証
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');

            // Firebase UIDからユーザーIDを取得
            $user = User::where('firebase_uid', $firebaseUid)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'ユーザーが見つかりません'
                ], 404);
            }

            // いいねの存在確認
            $like = Like::where('user_id', $user->id)
                        ->where('post_id', $postId)
                        ->first();

            if (!$like) {
                return response()->json([
                    'success' => false,
                    'error' => 'いいねが見つかりません'
                ], 404);
            }

            // いいねを削除
            $like->delete();

            // 現在のいいね数を取得
            $likesCount = Like::where('post_id', $postId)->count();

            \Log::info('いいね解除成功', [
                'user_id' => $user->id,
                'post_id' => $postId,
                'likes_count' => $likesCount
            ]);

            return response()->json([
                'success' => true,
                'message' => 'いいねを解除しました',
                'likes_count' => $likesCount
            ]);

        } catch (Exception $e) {
            \Log::error('いいね解除エラー', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'いいねの解除に失敗しました'
            ], 500);
        }
    }
}
