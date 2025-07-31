<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <main class="flex-1 md:pl-2 pl-4">
    <div class="w-full max-w-none">
      <PageHeader :title="title" />
      
      <!-- 各ページ固有のコンテンツ -->
      <section>
        <slot />
      </section>
      
      <!-- フッタースペース（モバイルでのナビゲーション用） -->
      <div class="h-20 md:h-4"></div>
    </div>
  </main>
</template>