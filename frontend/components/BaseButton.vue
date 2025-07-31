<script setup lang="ts">
interface Props {
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  loadingText?: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

interface Emits {
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  loading: false,
  disabled: false,
  loadingText: '処理中...',
  variant: 'primary',
  size: 'md'
})

const emit = defineEmits<Emits>()

// クリックハンドラー
const handleClick = (event: MouseEvent) => {
  if (!props.loading && !props.disabled) {
    emit('click', event)
  }
}

// 動的なクラス設定
const buttonClass = computed(() => {
  const baseClass = 'font-medium rounded-full transition-all duration-200 focus:outline-none shadow-lg transform border border-black'
  
  // サイズクラス
  const sizeClasses = {
    sm: 'py-2 px-8 text-sm',
    md: 'py-3 px-12 text-base',
    lg: 'py-4 px-16 text-lg'
  }
  
  // バリアントクラス
  const variantClasses = {
    primary: 'bg-purple-gradient text-white hover:bg-purple-800 hover:scale-105 hover:shadow-xl disabled:bg-purple-400 disabled:hover:scale-100 disabled:hover:shadow-lg',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:scale-105 hover:shadow-xl disabled:bg-gray-300 disabled:hover:scale-100 disabled:hover:shadow-lg'
  }
  
  const sizeClass = sizeClasses[props.size]
  const variantClass = variantClasses[props.variant]
  
  return `${baseClass} ${sizeClass} ${variantClass}`
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClass"
    @click="handleClick"
  >
    <span v-if="!loading">
      <slot />
    </span>
    <span v-else>
      {{ loadingText }}
    </span>
  </button>
</template>