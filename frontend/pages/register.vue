<script setup lang="ts">
// ゲスト専用ページ - ログイン済みの場合はリダイレクト
definePageMeta({
  middleware: 'guest-only'
})

// 登録成功時のハンドラー
const handleRegistrationSuccess = async () => {
  // 登録成功 - ホーム画面にリダイレクト
  await navigateTo('/')
}

// ページタイトル設定
useHead({
  title: '新規登録 - SHARE'
})
</script>

<template>
  <div class="min-h-screen bg-custom-dark">
    <!-- ヘッダー -->
    <AuthHeader />

    <!-- メインコンテンツ -->
    <main class="flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <!-- 登録フォーム -->
        <RegisterForm @success="handleRegistrationSuccess" />
      </div>
    </main>
  </div>
</template>
