<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Post;
use App\Models\User;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth;
use Exception;

class PostController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            // 認証されたユーザーIDを取得（認証は任意）
            $currentUserId = null;
            $jwt = $request->cookie('auth_jwt');

            if (!empty($jwt)) {
                try {
                    $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
                    $firebaseAuth = $factory->createAuth();
                    $verifiedIdToken = $firebaseAuth->verifyIdToken($jwt);
                    $firebaseUid = $verifiedIdToken->claims()->get('sub');

                    $user = User::where('firebase_uid', $firebaseUid)->first();
                    if ($user) {
                        $currentUserId = $user->id;
                    }
                } catch (Exception $e) {
                    // 認証エラーは無視（ログインしていない状態として処理）
                }
            }

            // ページネーションのパラメータを取得
            $page = (int) $request->get('page', 1);
            $perPage = (int) $request->get('per_page', 20);

            // 投稿を作成日時の降順で取得（最新順）with ページネーション
            // ユーザー情報といいね数も一緒に取得
            $posts = Post::with(['user:id,name,email', 'likes'])
                ->withCount('likes') // いいね数をカウント
                ->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            $postsData = $posts->getCollection()->map(function ($post) use ($currentUserId) {
                // 現在のユーザーがこの投稿にいいねしているかチェック
                $isLiked = false;
                if ($currentUserId) {
                    $isLiked = $post->likes->contains('user_id', $currentUserId);
                }

                return [
                    'id' => $post->id,
                    'body' => $post->body,
                    'user' => [
                        'id' => $post->user->id,
                        'name' => $post->user->name,
                        'email' => $post->user->email,
                    ],
                    'likes_count' => $post->likes_count,
                    'is_liked' => $isLiked, // 現在のユーザーのいいね状態
                ];
            });

            return response()->json([
                'success' => true,
                'posts' => $postsData,
                'current_user_id' => $currentUserId,
                'pagination' => [
                    'current_page' => $posts->currentPage(),
                    'last_page' => $posts->lastPage(),
                    'per_page' => $posts->perPage(),
                    'total' => $posts->total(),
                    'has_next_page' => $posts->hasMorePages(),
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('投稿一覧取得エラー', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => '投稿の取得に失敗しました'
            ], 500);
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
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
            $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
            $firebaseAuth = $factory->createAuth();
            $verifiedIdToken = $firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');

            // Firebase UIDからユーザーIDを取得
            $user = User::where('firebase_uid', $firebaseUid)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'ユーザーが見つかりません'
                ], 404);
            }

            // バリデーション
            $validated = $request->validate([
                'content' => 'required|string|max:120',
            ]);

            // 投稿作成
            $post = Post::create([
                'user_id' => $user->id,
                'body' => $validated['content'],
            ]);

            \Log::info('投稿作成成功', [
                'post_id' => $post->id,
                'firebase_uid' => $firebaseUid
            ]);

            // 作成した投稿を完全な形で取得（ユーザー情報といいね情報を含む）
            $createdPost = Post::with(['user:id,name,email'])
                ->withCount('likes')
                ->find($post->id);

            return response()->json([
                'success' => true,
                'message' => '投稿を作成しました',
                'post' => [
                    'id' => $createdPost->id,
                    'body' => $createdPost->body,
                    'user' => [
                        'id' => $createdPost->user->id,
                        'name' => $createdPost->user->name,
                        'email' => $createdPost->user->email,
                    ],
                    'likes_count' => $createdPost->likes_count,
                    'is_liked' => false, // 新規投稿なので必ずfalse
                ]
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'バリデーションエラー',
                'details' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('投稿作成エラー', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => '投稿の作成に失敗しました',
                'debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        try {
            // 認証されたユーザーIDを取得（認証は任意）
            $currentUserId = null;
            $jwt = $request->cookie('auth_jwt');

            if (!empty($jwt)) {
                try {
                    $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
                    $firebaseAuth = $factory->createAuth();
                    $verifiedIdToken = $firebaseAuth->verifyIdToken($jwt);
                    $firebaseUid = $verifiedIdToken->claims()->get('sub');

                    $user = User::where('firebase_uid', $firebaseUid)->first();
                    if ($user) {
                        $currentUserId = $user->id;
                    }
                } catch (Exception $e) {
                    \Log::warning('投稿詳細取得時の認証エラー', ['error' => $e->getMessage()]);
                }
            }

            // 投稿を取得（存在チェック）
            $post = Post::with(['user:id,name,email'])
                ->withCount('likes')
                ->find($id);

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'error' => '投稿が見つかりません'
                ], 404);
            }

            // 現在のユーザーがこの投稿にいいねしているかチェック
            $isLiked = false;
            if ($currentUserId) {
                $isLiked = $post->likes->contains('user_id', $currentUserId);
            }

            $postData = [
                'id' => $post->id,
                'body' => $post->body,
                'user' => [
                    'id' => $post->user->id,
                    'name' => $post->user->name,
                    'email' => $post->user->email,
                ],
                'likes_count' => $post->likes_count,
                'is_liked' => $isLiked,
            ];

            return response()->json([
                'success' => true,
                'post' => $postData,
                'current_user_id' => $currentUserId,
            ]);

        } catch (Exception $e) {
            \Log::error('投稿詳細取得エラー', ['error' => $e->getMessage(), 'post_id' => $id]);

            return response()->json([
                'success' => false,
                'error' => '投稿の取得に失敗しました'
            ], 500);
        }
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
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
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
            $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
            $firebaseAuth = $factory->createAuth();
            $verifiedIdToken = $firebaseAuth->verifyIdToken($jwt);
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
            $post = Post::find($id);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'error' => '投稿が見つかりません'
                ], 404);
            }

            // 投稿の所有者チェック（自分の投稿のみ削除可能）
            if ($post->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'error' => '他のユーザーの投稿は削除できません'
                ], 403);
            }

            // 論理削除（SoftDelete）を実行
            $post->delete();

            \Log::info('投稿論理削除成功', [
                'post_id' => $id,
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => '投稿を削除しました',
                'post_id' => $id
            ]);

        } catch (Exception $e) {
            \Log::error('投稿削除エラー', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => '投稿の削除に失敗しました'
            ], 500);
        }
    }

    /**
     * 投稿を復元（論理削除から復旧）
     */
    public function restore(Request $request, $id)
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
            $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
            $firebaseAuth = $factory->createAuth();
            $verifiedIdToken = $firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');

            // Firebase UIDからユーザーIDを取得
            $user = User::where('firebase_uid', $firebaseUid)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'ユーザーが見つかりません'
                ], 404);
            }

            // 削除された投稿を取得（withTrashedで論理削除も含む）
            $post = Post::withTrashed()->find($id);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'error' => '投稿が見つかりません'
                ], 404);
            }

            // 投稿が削除されているかチェック
            if (!$post->trashed()) {
                return response()->json([
                    'success' => false,
                    'error' => 'この投稿は削除されていません'
                ], 400);
            }

            // 投稿の所有者チェック（自分の投稿のみ復元可能）
            if ($post->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'error' => '他のユーザーの投稿は復元できません'
                ], 403);
            }

            // 投稿を復元
            $post->restore();

            \Log::info('投稿復元成功', [
                'post_id' => $id,
                'user_id' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => '投稿を復元しました',
                'post_id' => $id
            ]);

        } catch (Exception $e) {
            \Log::error('投稿復元エラー', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => '投稿の復元に失敗しました'
            ], 500);
        }
    }
}
