<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Kreait\Firebase\Factory;
use Exception;

class CommentController extends Controller
{
    /**
     * Display a listing of comments for a specific post.
     */
    public function index(Request $request, string $postId)
    {
        try {
            // 投稿の存在確認
            $post = Post::find($postId);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'error' => '投稿が見つかりません'
                ], 404);
            }

            // ページネーション設定
            $perPage = $request->get('per_page', 10);
            $page = $request->get('page', 1);

            // コメント一覧を取得（新しい順、ページネーション）
            $comments = Comment::with(['user:id,name,email'])
                ->where('post_id', $postId)
                ->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            $commentsData = $comments->map(function ($comment) {
                return [
                    'id' => $comment->id,
                    'content' => $comment->body,
                    'user' => [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                        'email' => $comment->user->email,
                    ],
                ];
            });

            return response()->json([
                'success' => true,
                'comments' => $commentsData,
                'pagination' => [
                    'current_page' => $comments->currentPage(),
                    'last_page' => $comments->lastPage(),
                    'per_page' => $comments->perPage(),
                    'total' => $comments->total(),
                    'has_more_pages' => $comments->hasMorePages(),
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('コメント一覧取得エラー', ['error' => $e->getMessage(), 'post_id' => $postId]);
            
            return response()->json([
                'success' => false,
                'error' => 'コメントの取得に失敗しました'
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
     * Store a newly created comment in storage.
     */
    public function store(Request $request, string $postId)
    {
        try {
            // 投稿の存在確認
            $post = Post::find($postId);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'error' => '投稿が見つかりません'
                ], 404);
            }

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
            ], [
                'content.required' => 'コメント内容は必須です',
                'content.max' => 'コメントは120文字以内で入力してください',
            ]);

            // コメント作成
            $comment = Comment::create([
                'post_id' => $postId,
                'user_id' => $user->id,
                'body' => $validated['content'],
            ]);

            // 作成したコメントを完全な形で取得
            $createdComment = Comment::with(['user:id,name,email'])
                ->find($comment->id);

            return response()->json([
                'success' => true,
                'message' => 'コメントを投稿しました',
                'comment' => [
                    'id' => $createdComment->id,
                    'content' => $createdComment->body,
                    'user' => [
                        'id' => $createdComment->user->id,
                        'name' => $createdComment->user->name,
                        'email' => $createdComment->user->email,
                    ],
                ]
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'バリデーションエラー',
                'details' => $e->errors()
            ], 422);

        } catch (Exception $e) {
            \Log::error('コメント作成エラー', [
                'error' => $e->getMessage(),
                'post_id' => $postId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'コメントの投稿に失敗しました'
            ], 500);
        }
    }
}
