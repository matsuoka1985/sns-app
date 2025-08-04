export interface CharacterCountConfig {
  maxLength: number
  warningThreshold: number // 警告表示する残り文字数
  colors: {
    normal: string
    warning: string
    error: string
  }
  gauge: {
    radius: number
    strokeWidth: number
    size: number
  }
}

const defaultConfig: CharacterCountConfig = {
  maxLength: 120,
  warningThreshold: 10,
  colors: {
    normal: '#3b82f6',   // 青色
    warning: '#f59e0b',  // 黄色
    error: '#ef4444'     // 赤色
  },
  gauge: {
    radius: 16,
    strokeWidth: 3,
    size: 36
  }
}

const config = ref<CharacterCountConfig>(defaultConfig)

export const useCharacterCount = (text: Ref<string | undefined> = ref('')) => {
  const updateConfig = (newConfig: Partial<CharacterCountConfig>) => {
    config.value = { ...config.value, ...newConfig }
  }

  const currentLength = computed(() => text.value?.length || 0)
  const remainingChars = computed(() => config.value.maxLength - currentLength.value)
  const isNearLimit = computed(() => remainingChars.value <= config.value.warningThreshold && remainingChars.value >= 0)
  const isOverLimit = computed(() => remainingChars.value < 0)

  // ゲージの色
  const gaugeColor = computed(() => {
    if (isOverLimit.value) return config.value.colors.error
    if (isNearLimit.value) return config.value.colors.warning
    return config.value.colors.normal
  })

  // ゲージのパーセンテージ
  const gaugePercentage = computed(() => {
    const percentage = (currentLength.value / config.value.maxLength) * 100
    return Math.min(percentage, 100)
  })

  // SVGドーナツゲージの計算
  const circumference = computed(() => 2 * Math.PI * config.value.gauge.radius)
  const strokeDasharray = computed(() => {
    const progress = (gaugePercentage.value / 100) * circumference.value
    return `${progress} ${circumference.value}`
  })

  // バリデーション関数
  const validate = (value: string): string | undefined => {
    if (!value || value.trim() === '') {
      return '入力してください'
    }
    if (value.length > config.value.maxLength) {
      return `${config.value.maxLength}文字以内で入力してください`
    }
    return undefined
  }

  return {
    config: readonly(config),
    updateConfig,
    currentLength,
    remainingChars,
    isNearLimit,
    isOverLimit,
    gaugeColor,
    gaugePercentage,
    circumference,
    strokeDasharray,
    validate
  }
}