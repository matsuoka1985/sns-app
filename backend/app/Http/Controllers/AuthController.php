<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth;
use Exception;

class AuthController extends Controller
{
    private $firebaseAuth;
    
    public function __construct()
    {
        $factory = (new Factory)
            ->withServiceAccount(storage_path('app/firebase/firebase-adminsdk.json'));
        $this->firebaseAuth = $factory->createAuth();
    }
    
    public function register(Request $request)
    {
        try {
            // バリデーション
            $validator = Validator::make($request->all(), [
                'firebase_uid' => 'required|string|unique:users,firebase_uid',
                'name' => 'required|string|max:20', // 20文字制限
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6', // 6文字以上制限
            ]);

            if ($validator->fails()) {
                // バリデーション失敗時、Firebase Authからユーザーを削除
                if ($request->firebase_uid) {
                    $this->deleteFirebaseUser($request->firebase_uid);
                }
                
                return response()->json([
                    'success' => false,
                    'error' => 'バリデーションエラー',
                    'details' => $validator->errors()
                ], 400);
            }

            // 20文字チェック（追加の安全策）
            if (strlen($request->name) > 20) {
                // Firebase Authからユーザーを削除
                $this->deleteFirebaseUser($request->firebase_uid);
                
                return response()->json([
                    'success' => false,
                    'error' => 'ユーザー名は20文字以内で入力してください',
                    'length' => strlen($request->name)
                ], 400);
            }

            // 6文字未満パスワードチェック（追加の安全策）
            if (strlen($request->password) < 6) {
                // Firebase Authからユーザーを削除
                $this->deleteFirebaseUser($request->firebase_uid);
                
                return response()->json([
                    'success' => false,
                    'error' => 'パスワードは6文字以上で入力してください',
                    'length' => strlen($request->password)
                ], 400);
            }

            // Firebase Authのユーザー情報を確認（存在チェック）
            try {
                $firebaseUser = $this->firebaseAuth->getUser($request->firebase_uid);
            } catch (Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => 'Firebase ユーザーが見つかりません',
                    'details' => $e->getMessage()
                ], 400);
            }
            
            // Laravel DBにユーザー作成
            $user = User::create([
                'firebase_uid' => $request->firebase_uid,
                'name' => $request->name,
                'email' => $request->email,
            ]);

            Log::info('User registered successfully', [
                'user_id' => $user->id,
                'firebase_uid' => $request->firebase_uid,
                'name' => $request->name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'ユーザー登録が完了しました',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'firebase_uid' => $user->firebase_uid
                ]
            ], 201);
            
        } catch (Exception $e) {
            Log::error('User registration failed', [
                'error' => $e->getMessage(),
                'firebase_uid' => $request->firebase_uid ?? null
            ]);
            
            // エラー時もFirebase Authからユーザーを削除
            if ($request->firebase_uid) {
                $this->deleteFirebaseUser($request->firebase_uid);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'ユーザー登録に失敗しました',
                'details' => $e->getMessage()
            ], 500);
        }
    }
    
    private function deleteFirebaseUser($firebaseUid)
    {
        try {
            $this->firebaseAuth->deleteUser($firebaseUid);
            Log::info('Firebase user deleted due to validation failure', [
                'firebase_uid' => $firebaseUid
            ]);
        } catch (Exception $e) {
            Log::error('Failed to delete Firebase user', [
                'firebase_uid' => $firebaseUid,
                'error' => $e->getMessage()
            ]);
        }
    }
    
    public function login(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'firebase_uid' => 'required|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'バリデーションエラー',
                    'details' => $validator->errors()
                ], 400);
            }

            // Laravel DBでユーザーを検索
            $user = User::where('firebase_uid', $request->firebase_uid)->first();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'ユーザーが見つかりません'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'message' => 'ログイン成功',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'firebase_uid' => $user->firebase_uid
                ]
            ]);
            
        } catch (Exception $e) {
            Log::error('Login failed', [
                'error' => $e->getMessage(),
                'firebase_uid' => $request->firebase_uid ?? null
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'ログインに失敗しました',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}
