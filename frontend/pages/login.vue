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
  <AuthLayout>
    <!-- ログインフォーム -->
    <LoginForm @success="handleLoginSuccess" />
  </AuthLayout>
</template>