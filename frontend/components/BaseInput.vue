<script setup lang="ts">
interface Props {
  name: string
  type?: string
  placeholder?: string
  modelValue?: string
  errorMessage?: string
  maxlength?: number
  minlength?: number
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
}

// プロパティのデフォルト値を設定
const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  modelValue: '',
  errorMessage: '',
  disabled: false
})

const emit = defineEmits<Emits>()

// 入力時のハンドラー
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

// ブラー時のハンドラー
const handleBlur = () => {
  emit('blur')
}

// 動的なクラス設定
const inputClass = computed(() => {
  const baseClass = 'w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors duration-200 text-base bg-white'
  const borderClass = props.errorMessage
    ? 'border-red-400 focus:border-red-500'
    : 'border-black focus:border-gray-600'

  return `${baseClass} ${borderClass}`
})
</script>

<template>
  <div>
    <input
      :id="name"
      :name="name"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :minlength="minlength"
      :disabled="disabled"
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur" 
      :class="inputClass"
    />
    <div v-if="errorMessage" class="text-red-500 text-sm mt-2 px-4">
      {{ errorMessage }}
    </div>
  </div>
</template>