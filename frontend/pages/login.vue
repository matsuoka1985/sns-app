<script setup lang="ts">
// ゲスト専用ページ - ログイン済みの場合はリダイレクト
definePageMeta({
  middleware: 'guest-only'
})

// ログイン成功時のハンドラー
const handleLoginSuccess = async () => {
  // ログイン成功 - ホーム画面にリダイレクト
  await navigateTo('/')
}

// ページタイトル設定
useHead({
  title: 'ログイン - SHARE'
})
</script>

<template>
  <div class="min-h-screen bg-custom-dark">
    <!-- ヘッダー -->
    <AuthHeader />

    <!-- メインコンテンツ -->
    <main class="flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <!-- ログインフォーム -->
        <LoginForm @success="handleLoginSuccess" />
      </div>
    </main>
  </div>
</template>