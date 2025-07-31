<script setup lang="ts">
interface User {
  id: number
  name: string
  email: string
}

interface Props {
  id: number
  content: string
  user: User
}

const props = defineProps<Props>()
</script>

<template>
  <article class="bg-custom-dark border-l border-b border-white p-4">
    <!-- ユーザー名 -->
    <div class="mb-2">
      <span class="text-white font-bold">{{ user.name }}</span>
    </div>
    
    <!-- コメント内容 -->
    <div class="text-white text-sm leading-relaxed">
      {{ content }}
    </div>
  </article>
</template>