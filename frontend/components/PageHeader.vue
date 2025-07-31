<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()

// サイドバーを開く（featherボタン専用）
const openSidebar = () => {
  const sidebar = document.getElementById('sidebar')
  sidebar?.classList.remove('-translate-x-full')
}
</script>

<template>
  <header class="sticky top-0 bg-custom-dark/95 backdrop-blur-sm border-l border-b border-white px-4 py-4 z-30">
    <!-- モバイル時のロゴ表示 -->
    <div class="md:hidden flex justify-center mb-4">
      <img src="/images/logo.png" alt="SHARE" class="h-8 object-contain" />
    </div>
    
    <div class="flex items-center justify-between">
      <h1 class="text-white text-2xl font-bold">{{ title }}</h1>
    </div>
  </header>
</template>