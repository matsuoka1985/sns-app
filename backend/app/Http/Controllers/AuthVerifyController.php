<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth;
use Exception;

class AuthVerifyController extends Controller
{
    private Auth $firebaseAuth;

    public function __construct()
    {
        // Firebase Admin SDK の初期化
        $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
        $this->firebaseAuth = $factory->createAuth();
    }

    /**
     * Firebase IDトークンを検証してHTTP-Only Cookieを設定
     */
    public function verifyAndSetCookie(Request $request)
    {
        try {
            $idToken = $request->input('idToken');
            
            if (empty($idToken)) {
                return response()->json([
                    'success' => false,
                    'error' => 'IDトークンが提供されていません'
                ], 400);
            }

            // Firebase Admin SDK でトークンを検証
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');
            $email = $verifiedIdToken->claims()->get('email');
            
            \Log::info('🔥 Firebase Admin SDK 検証成功', [
                'uid' => $firebaseUid,
                'email' => $email,
                'exp' => $verifiedIdToken->claims()->get('exp')
            ]);

            \Log::info('Firebase Admin SDK 検証成功', [
                'firebase_uid' => $firebaseUid,
                'firebase_email' => $email,
                'jwt_exp' => $verifiedIdToken->claims()->get('exp')
            ]);

            // HTTP-Only Cookie を設定（JWT本体）
            $response = response()->json([
                'success' => true,
                'message' => '認証成功',
                'user' => [
                    'uid' => $firebaseUid,
                    'email' => $email
                ]
            ]);

            // JWTをHTTP-Onlyで設定（ステートレス）
            return $response->withCookie(cookie(
                'auth_jwt', // Cookie名
                $idToken, // JWT本体
                60 * 24 * 7, // 7日間（分単位）
                '/', // パス
                'localhost', // ドメイン
                false, // HTTPS必須（開発環境はfalse）
                true, // HTTP-Only（JavaScriptからアクセス不可）
                false, // Raw
                'lax' // SameSite
            ));

        } catch (Exception $e) {
            \Log::error('Firebase Admin SDK 検証エラー', [
                'error' => $e->getMessage(),
                'token' => substr($idToken ?? '', 0, 50) . '...'
            ]);

            return response()->json([
                'success' => false,
                'error' => 'トークンの検証に失敗しました: ' . $e->getMessage()
            ], 401);
        }
    }

    /**
     * 現在の認証状態を確認（ステートレス JWT 検証）
     */
    public function checkAuth(Request $request)
    {
        try {
            // JWTをCookieから取得
            $jwt = $request->cookie('auth_jwt');
            
            \Log::info('認証チェック開始', [
                'jwt_exists' => !empty($jwt),
                'all_cookies' => array_keys($request->cookies->all())
            ]);

            if (empty($jwt)) {
                return response()->json([
                    'authenticated' => false,
                    'message' => 'JWTCookieが見つかりません'
                ]);
            }

            // Firebase Admin SDK でJWT検証（ステートレス）
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');
            $firebaseEmail = $verifiedIdToken->claims()->get('email');
            $expiry = $verifiedIdToken->claims()->get('exp');

            \Log::info('JWT検証成功', [
                'firebase_uid' => $firebaseUid,
                'firebase_email' => $firebaseEmail,
                'jwt_exp' => $expiry->format('Y-m-d H:i:s')
            ]);

            return response()->json([
                'authenticated' => true,
                'user' => [
                    'uid' => $firebaseUid,
                    'email' => $firebaseEmail,
                    'expires_at' => $expiry->format('Y-m-d H:i:s')
                ]
            ]);

        } catch (Exception $e) {
            \Log::error('JWT認証チェックエラー', ['error' => $e->getMessage()]);
            
            return response()->json([
                'authenticated' => false,
                'error' => 'JWT検証に失敗しました: ' . $e->getMessage()
            ], 401);
        }
    }

    /**
     * ログアウト（JWT Cookie削除）
     */
    public function logout(Request $request)
    {
        try {
            \Log::info('ログアウト実行');

            // HTTP-Only JWT Cookieを削除
            $response = response()->json([
                'success' => true,
                'message' => 'ログアウトしました'
            ]);

            return $response->withCookie(cookie(
                'auth_jwt', 
                '', 
                -1, 
                '/', 
                'localhost', 
                false, 
                true, 
                false, 
                'lax'
            ));

        } catch (Exception $e) {
            \Log::error('ログアウトエラー', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}