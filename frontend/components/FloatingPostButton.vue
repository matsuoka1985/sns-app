<script setup lang="ts">
interface Props {
  hideWhenTyping?: boolean
  commentBody?: string
}

const props = withDefaults(defineProps<Props>(), {
  hideWhenTyping: false,
  commentBody: ''
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}

// 表示条件の計算
const shouldShow = computed(() => {
  if (!props.hideWhenTyping) return true
  return !props.commentBody.trim()
})
</script>

<template>
  <!-- フローティング投稿ボタン（モバイルのみ） -->
  <button
    v-show="shouldShow"
    @click="handleClick"
    class="fixed bottom-6 right-6 w-14 h-14 bg-purple-gradient hover:opacity-90 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition-all md:hidden"
  >
    <img src="/images/feather.png" alt="投稿" class="w-6 h-6" />
  </button>
</template>