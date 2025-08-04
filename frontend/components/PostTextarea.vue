<script setup lang="ts">
interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  height?: string
  maxLength?: number
  showCharacterCount?: boolean
  showLabel?: boolean
  label?: string
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '何か入力してください...',
  disabled: false,
  height: 'h-32',
  maxLength: 120,
  showCharacterCount: true,
  showLabel: false,
  label: '',
  error: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
  'focus': []
  'overLimit': [isOver: boolean]
}>()

// 文字数カウント機能
const textRef = ref(props.modelValue || '')
const { 
  currentLength, 
  remainingChars, 
  isNearLimit, 
  isOverLimit, 
  gaugeColor, 
  strokeDasharray,
  config: charConfig,
  updateConfig
} = useCharacterCount(textRef)

// maxLengthが変更されたら設定を更新
watch(() => props.maxLength, (newMaxLength) => {
  updateConfig({ maxLength: newMaxLength })
}, { immediate: true })

// propsのmodelValueを監視してtextRefに同期
watch(() => props.modelValue, (newValue) => {
  textRef.value = newValue || ''
})

// textRefの変更を親に通知
watch(textRef, (newValue) => {
  emit('update:modelValue', newValue)
})

// 文字数超過状態を親に通知
watch(isOverLimit, (isOver) => {
  emit('overLimit', isOver)
}, { immediate: true })

// フォーカス・ブラーイベント
const handleFocus = () => {
  emit('focus')
}

const handleBlur = () => {
  emit('blur')
}

// バリデーション
const hasError = computed(() => {
  return !!props.error || isOverLimit.value
})

const errorMessage = computed(() => {
  if (props.error) return props.error
  if (isOverLimit.value) return `${charConfig.value.maxLength}文字以内で入力してください`
  return ''
})
</script>

<template>
  <div class="space-y-2">
    <!-- ラベル -->
    <label v-if="showLabel && label" class="block text-white text-sm font-medium">
      {{ label }}
    </label>

    <!-- テキストエリア -->
    <div 
      class="border-2 rounded-lg transition-colors"
      :class="{
        'border-white focus-within:border-purple-500': !hasError,
        'border-red-500 focus-within:border-red-500': hasError
      }"
    >
      <textarea 
        v-model="textRef"
        :disabled="disabled"
        :placeholder="placeholder"
        :class="[
          'w-full bg-transparent text-white placeholder-gray-400 resize-none outline-none p-4 border-none focus:outline-none focus:ring-0',
          height
        ]"
        @focus="handleFocus"
        @blur="handleBlur"
      ></textarea>
    </div>
    
    <!-- 文字数ゲージ -->
    <div v-if="showCharacterCount && currentLength > 0" class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <!-- ドーナツゲージ -->
        <div class="relative">
          <svg :width="charConfig.gauge.size" :height="charConfig.gauge.size" class="transform -rotate-90">
            <!-- 背景の円 -->
            <circle
              :cx="charConfig.gauge.size / 2"
              :cy="charConfig.gauge.size / 2"
              :r="charConfig.gauge.radius"
              stroke="#374151"
              :stroke-width="charConfig.gauge.strokeWidth"
              fill="none"
            />
            <!-- プログレス円 -->
            <circle
              :cx="charConfig.gauge.size / 2"
              :cy="charConfig.gauge.size / 2"
              :r="charConfig.gauge.radius"
              :stroke="gaugeColor"
              :stroke-width="charConfig.gauge.strokeWidth"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="strokeDasharray"
              :stroke-dashoffset="0"
              class="transition-all duration-300"
            />
          </svg>
        </div>
        
        <!-- 文字数表示 -->
        <span 
          v-if="isNearLimit || isOverLimit"
          :class="{
            'text-yellow-500': isNearLimit && !isOverLimit,
            'text-red-500': isOverLimit
          }"
          class="text-sm font-medium"
        >
          {{ remainingChars }}
        </span>
      </div>
    </div>
    
    <!-- エラーメッセージ -->
    <div class="h-6">
      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>
    </div>
  </div>
</template>