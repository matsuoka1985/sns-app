<?php

use Illuminate\Support\Facades\Route;
use Kreait\Firebase\Factory;
use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuthVerifyController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\CommentController;

Route::post('/auth/check-token', function (Request $request) {
    $idToken = $request->bearerToken(); // Authorization: Bearer {idToken}
    if (!$idToken) {
        return response()->json(['error' => 'No token provided'], 400);
    }

    try {
        $auth = (new Factory)
            ->withServiceAccount(config('firebase.credentials.file'))
            ->createAuth();

        $verifiedIdToken = $auth->verifyIdToken($idToken);
        $uid = $verifiedIdToken->claims()->get('sub');

        return response()->json([
            'uid' => $uid,
            'message' => 'Token is valid',
        ]);
    } catch (\Throwable $e) {
        \Log::error('check-token failed: '.$e->getMessage(), ['exception' => $e]);
        return response()->json([
            'error' => 'Invalid token',
            'message' => $e->getMessage(),
        ], 401);
    }
});

Route::post('/auth/firebase-login', function (Request $request) {
    $idToken = $request->bearerToken();
    if (!$idToken) {
        return response()->json(['message' => 'Missing token'], 400);
    }

    try {
        $auth = (new Factory)
            ->withServiceAccount(config('firebase.credentials.file'))
            ->createAuth();

        // IDトークン検証
        $verifiedIdToken = $auth->verifyIdToken($idToken);
        $uid = $verifiedIdToken->claims()->get('sub');

        // Firebase上のユーザー詳細取得
        $firebaseUser = $auth->getUser($uid);

        // ---- Minimum sync using existing users table only ----
        // We have: id, name, email (unique), email_verified_at, password, remember_token
        // We'll store the Firebase UID temporarily in remember_token.
        // Use email uniqueness to identify the user.

        $email = $firebaseUser->email;
        if (!$email) {
            return response()->json([
                'message' => 'Firebase user has no email; cannot sync with current schema'
            ], 422);
        }

        $displayName = $firebaseUser->displayName
            ?: (strpos($email, '@') !== false ? strstr($email, '@', true) : 'User');

        $user = \App\Models\User::where('email', $email)->first();

        if (!$user) {
            // Create new user
            $user = \App\Models\User::create([
                'firebase_uid'      => $uid,
                'name'              => $displayName,
                'email'             => $email,
                'email_verified_at' => $firebaseUser->emailVerified ? now() : null,
            ]);
            $newUser = true;
        } else {
            // Update name / firebase_uid in case they changed
            $user->update([
                'name'        => $displayName,
                'firebase_uid' => $uid,
            ]);
            $newUser = false;
        }

        return response()->json([
            'success' => true,
            'new_user' => $newUser,
            'user' => [
                'id'           => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'email'        => $user->email,
                'name'         => $user->name,
            ],
        ])->cookie(
            'auth_jwt',
            $idToken,
            60 * 24, // 24時間
            '/',
            null, // ドメイン指定なし（サブドメイン間で共有）
            false, // secure (開発環境ではfalse)
            true, // httpOnly
            false, // raw
            'lax'  // sameSite
        );
    } catch (\Throwable $e) {
        \Log::error('firebase-login failed: '.$e->getMessage(), ['exception' => $e]);
        return response()->json([
            'message' => 'Invalid token',
            'error'   => $e->getMessage(),
        ], 401);
    }
});

// 新しい認証エンドポイント
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Firebase Admin SDK 認証検証（HTTP-Only Cookie）
Route::post('/auth/verify-token', [AuthVerifyController::class, 'verifyAndSetCookie']);
Route::get('/auth/check', [AuthVerifyController::class, 'checkAuth']);
Route::post('/auth/logout', [AuthVerifyController::class, 'logout']);

// 投稿関連のエンドポイント
Route::get('/posts', [PostController::class, 'index']);
Route::post('/posts', [PostController::class, 'store']);
Route::get('/posts/{id}', [PostController::class, 'show']);
Route::delete('/posts/{id}', [PostController::class, 'destroy']);
Route::post('/posts/{id}/restore', [PostController::class, 'restore']);

// いいね関連のエンドポイント
Route::post('/posts/{postId}/like', [LikeController::class, 'store']);
Route::delete('/posts/{postId}/like', [LikeController::class, 'destroy']);

// コメント関連のエンドポイント
Route::get('/posts/{postId}/comments', [CommentController::class, 'index']);
Route::post('/posts/{postId}/comments', [CommentController::class, 'store']);
