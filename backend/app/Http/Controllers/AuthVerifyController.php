<?php

namespace App\Http\Controllers;

use App\Http\Requests\TokenVerifyRequest;
use App\Services\AuthVerifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class AuthVerifyController extends Controller
{
    private $authVerifyService;

    public function __construct(AuthVerifyService $authVerifyService)
    {
        $this->authVerifyService = $authVerifyService;
    }

    public function verifyAndSetCookie(TokenVerifyRequest $request)
    {
        try {
            $result = $this->authVerifyService->verifyToken($request->idToken);
            
            $response = response()->json([
                'success' => true,
                'message' => '認証成功',
                'user' => [
                    'uid' => $result['uid'],
                    'email' => $result['email']
                ]
            ]);

            return $response->withCookie(cookie(
                'auth_jwt',
                $result['token'],
                60 * 24 * 7,
                '/',
                'localhost',
                false,
                true,
                false,
                'lax'
            ));

        } catch (Exception $e) {
            Log::error('Firebase Admin SDK 検証エラー', [
                'error' => $e->getMessage(),
                'token' => substr($request->idToken ?? '', 0, 50) . '...'
            ]);

            return response()->json([
                'success' => false,
                'error' => 'トークンの検証に失敗しました: ' . $e->getMessage()
            ], 401);
        }
    }

    public function checkAuth(Request $request)
    {
        try {
            $jwt = $request->cookie('auth_jwt');
            
            Log::info('認証チェック開始', [
                'jwt_exists' => !empty($jwt),
                'all_cookies' => array_keys($request->cookies->all())
            ]);

            if (empty($jwt)) {
                return response()->json([
                    'authenticated' => false,
                    'message' => 'JWTCookieが見つかりません'
                ]);
            }

            $result = $this->authVerifyService->checkAuth($jwt);

            return response()->json([
                'authenticated' => true,
                'user' => [
                    'uid' => $result['uid'],
                    'email' => $result['email'],
                    'expires_at' => $result['expires_at']
                ]
            ]);

        } catch (Exception $e) {
            Log::error('JWT認証チェックエラー', ['error' => $e->getMessage()]);
            
            return response()->json([
                'authenticated' => false,
                'error' => 'JWT検証に失敗しました: ' . $e->getMessage()
            ], 401);
        }
    }

    public function checkToken(Request $request)
    {
        try {
            $idToken = $request->bearerToken();
            
            if (!$idToken) {
                return response()->json(['error' => 'No token provided'], 400);
            }

            $result = $this->authVerifyService->checkBearerToken($idToken);

            return response()->json([
                'uid' => $result['uid'],
                'message' => $result['message'],
            ]);

        } catch (Exception $e) {
            Log::error('check-token failed: ' . $e->getMessage(), ['exception' => $e]);
            
            return response()->json([
                'error' => 'Invalid token',
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    public function firebaseLogin(Request $request)
    {
        try {
            $idToken = $request->bearerToken();
            
            if (!$idToken) {
                return response()->json(['message' => 'Missing token'], 400);
            }

            $result = $this->authVerifyService->firebaseLogin($idToken);

            return response()->json([
                'success' => $result['success'],
                'new_user' => $result['new_user'],
                'user' => $result['user'],
            ])->cookie(
                'auth_jwt',
                $result['token'],
                60 * 24,
                '/',
                null,
                false,
                true,
                false,
                'lax'
            );

        } catch (Exception $e) {
            Log::error('firebase-login failed: ' . $e->getMessage(), ['exception' => $e]);
            
            if ($e->getMessage() === 'Firebase user has no email; cannot sync with current schema') {
                return response()->json([
                    'message' => $e->getMessage()
                ], 422);
            }
            
            return response()->json([
                'message' => 'Invalid token',
                'error'   => $e->getMessage(),
            ], 401);
        }
    }

    public function logout(Request $request)
    {
        try {
            Log::info('ログアウト実行');

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
            Log::error('ログアウトエラー', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}