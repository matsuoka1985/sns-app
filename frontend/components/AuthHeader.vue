<script setup>
        // ヘッダーコンポーネントのロジックが必要な場合はここに追加
</script>
<template>
  <header class="px-6 py-4 bg-custom-dark">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <!-- ロゴ -->
      <div class="flex items-center">
        <img src="/images/logo.png" alt="SHARE" class="h-8 w-auto md:h-10" />
      </div>

      <!-- ナビゲーションメニュー -->
      <nav class="flex items-center space-x-8">
        <NuxtLink to="/register" class="text-white hover:text-gray-300 transition-colors duration-200 text-lg font-normal">
          新規登録
        </NuxtLink>
        <NuxtLink to="/login" class="text-white hover:text-gray-300 transition-colors duration-200 text-lg font-normal">
          ログイン
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
