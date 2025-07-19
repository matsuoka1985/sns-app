<?php

use Illuminate\Support\Facades\Route;
use Kreait\Firebase\Factory;
use Illuminate\Http\Request;

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
        return response()->json([
            'error' => 'Invalid token',
            'message' => $e->getMessage(),
        ], 401);
    }
});
