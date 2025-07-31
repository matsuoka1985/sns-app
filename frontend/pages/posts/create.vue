<script setup lang="ts">
// 認証必須ページ（未ログインは絶対アクセス不可）
definePageMeta({
  middleware: 'require-auth'
})

// ページタイトル設定
useHead({
  title: '投稿作成 - SHARE'
})
</script>

<template>
  <div class="min-h-screen bg-custom-dark">
    <!-- ヘッダー -->
    <AuthHeader />

    <!-- メインコンテンツ -->
    <main class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold text-white mb-6">新しい投稿を作成</h1>
        
        <div class="bg-white rounded-lg shadow-lg p-6">
          <p class="text-gray-600 mb-4">🎉 認証成功！このページは認証されたユーザーのみアクセス可能です。</p>
          
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <h2 class="text-lg font-semibold text-gray-700 mb-2">仮の投稿ページ</h2>
            <p class="text-gray-500">後で正式な投稿フォームに置き換えます</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>