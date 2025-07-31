<script setup lang="ts">
interface User {
  id: number
  name: string
  email: string
}

interface Props {
  user: User
  body: string
  createdAt: string
  variant?: 'compact' | 'detailed'
  showDateTime?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'compact',
  showDateTime: false
})

// 日時フォーマット
const formattedDate = computed(() => {
  return new Date(props.createdAt).toLocaleString('ja-JP')
})

// バリアントに応じたスタイル
const userNameClass = computed(() => {
  switch (props.variant) {
    case 'detailed': return 'text-white font-medium text-lg mb-2'
    default: return 'text-white font-medium mb-3'
  }
})

const bodyClass = computed(() => {
  switch (props.variant) {
    case 'detailed': return 'text-white text-lg leading-relaxed mb-4'
    default: return 'text-white text-base leading-relaxed'
  }
})

const dateClass = computed(() => {
  switch (props.variant) {
    case 'detailed': return 'text-gray-400 text-sm'
    default: return 'text-gray-400 text-xs mt-2'
  }
})
</script>

<template>
  <div>
    <!-- ユーザー名 -->
    <div :class="userNameClass">{{ user.name }}</div>
    
    <!-- 投稿内容 -->
    <div :class="bodyClass">{{ body }}</div>

    <!-- 投稿日時（オプション） -->
    <div v-if="showDateTime" :class="dateClass">
      {{ formattedDate }}
    </div>
  </div>
</template>