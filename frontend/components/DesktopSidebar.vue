<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'

// Props
interface Props {
  postBody: string
}

const props = defineProps<Props>()

// 新規投稿用の状態
const isPosting = ref(false)

// バリデーションスキーマ
const validationSchema = toTypedSchema(
  yup.object({
    body: yup.string().max(120, '120文字以内で入力してください')
  })
)

// vee-validateのフォーム設定
const { errors, defineField, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema,
  validateOnMount: false
})

const [body, bodyAttrs] = defineField('body')

// propsの値をbodyフィールドに同期
watch(() => props.postBody, (newValue) => {
  body.value = newValue
}, { immediate: true })

// bodyフィールドの変更を親に通知
watch(body, (newValue) => {
  emit('updateBody', newValue || '')
})

// 文字数カウント関連
const maxLength = 120
const currentLength = computed(() => body.value?.length || 0)
const remainingChars = computed(() => maxLength - currentLength.value)
const isNearLimit = computed(() => remainingChars.value <= 10 && remainingChars.value >= 0)
const isOverLimit = computed(() => remainingChars.value < 0)

// ゲージの色とパーセンテージ
const gaugeColor = computed(() => {
  if (isOverLimit.value) return '#ef4444' // 赤色
  if (isNearLimit.value) return '#f59e0b' // 黄色
  return '#3b82f6' // 青色
})

const gaugePercentage = computed(() => {
  const percentage = (currentLength.value / maxLength) * 100
  return Math.min(percentage, 100)
})

// SVGドーナツゲージの計算
const radius = 16
const circumference = 2 * Math.PI * radius
const strokeDasharray = computed(() => {
  const progress = (gaugePercentage.value / 100) * circumference
  return `${progress} ${circumference}`
})

// 入力時にエラーをクリア（ただし文字数超過時は除く）
watch(body, () => {
  if (errors.value.body && currentLength.value <= maxLength) {
    setFieldError('body', undefined)
  }
})

// ログアウト処理
async function handleLogout() {
  try {
    await $fetch('/api/auth/logout', {
      method: 'POST'
    })
  } catch (error) {
    console.error('ログアウトエラー:', error)
    // エラーが発生してもログイン画面に遷移
  }
  await navigateTo('/login')
}

// Emits
const emit = defineEmits<{
  newPost: [post: any]
  updateBody: [body: string]
}>()

// 投稿作成処理
const createPost = handleSubmit(async () => {
  // submit時のみバリデーション実行
  if (!body.value || body.value.trim() === '') {
    setFieldError('body', '投稿内容を入力してください')
    return
  }
  
  if (body.value.length > maxLength) {
    setFieldError('body', `${maxLength}文字以内で入力してください`)
    return
  }

  // バリデーション成功時はエラーをクリア
  setFieldError('body', undefined)

  isPosting.value = true
  try {
    const response = await $fetch('/api/posts', {
      method: 'POST',
      body: { body: body.value.trim() }
    })

    if (response.success && response.post) {
      emit('newPost', response.post)
      emit('updateBody', '') // 共有bodyもクリア
      resetForm()
      
      const { success } = useToast()
      success('投稿しました！', 5000, {
        label: '詳細を見る',
        to: `/posts/${response.post.id}`
      })
    }
  } catch (error) {
    console.error('投稿作成エラー:', error)
    const { error: showErrorToast } = useToast()
    showErrorToast('投稿の作成に失敗しました')
  } finally {
    isPosting.value = false
  }
})
</script>

<template>
  <!-- 左サイドバー: 固定幅 -->
  <aside class="w-80 bg-custom-dark p-6 flex flex-col flex-shrink-0">
    <!-- ロゴ -->
    <NuxtLink to="/">
      <img src="/images/logo.png" alt="SHARE" class="w-32 h-auto mb-8 object-contain hover:opacity-80 transition-opacity cursor-pointer" />
    </NuxtLink>
    
    <!-- ナビゲーション -->
    <nav class="space-y-4 mb-8">
      <NuxtLink to="/" class="flex items-center space-x-3 text-white text-lg hover:text-gray-300">
        <img src="/images/home.png" alt="ホーム" class="w-6 h-6" />
        <span>ホーム</span>
      </NuxtLink>
      <button @click="handleLogout" class="flex items-center space-x-3 text-white text-lg hover:text-gray-300">
        <img src="/images/logout.png" alt="ログアウト" class="w-6 h-6" />
        <span>ログアウト</span>
      </button>
    </nav>

    <!-- 投稿エリア -->
    <div class="flex-1 flex flex-col">
      <h2 class="text-white text-lg mb-4">シェア</h2>
      <form @submit.prevent="createPost" class="flex-1 flex flex-col">
        <div class="border-2 border-white rounded-lg mb-4 h-32 flex-shrink-0 focus-within:border-purple-500 transition-colors">
          <textarea 
            v-model="body"
            v-bind="bodyAttrs"
            :disabled="isPosting"
            placeholder="今何してる？"
            class="w-full h-full bg-transparent text-white placeholder-gray-400 resize-none outline-none p-4 border-none focus:outline-none focus:ring-0"
          ></textarea>
        </div>
        
        <!-- 文字数ゲージと情報 -->
        <div v-if="currentLength > 0" class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <!-- ドーナツゲージ -->
            <div class="relative">
              <svg width="36" height="36" class="transform -rotate-90">
                <!-- 背景の円 -->
                <circle
                  cx="18"
                  cy="18"
                  :r="radius"
                  stroke="#374151"
                  stroke-width="3"
                  fill="none"
                />
                <!-- プログレス円 -->
                <circle
                  cx="18"
                  cy="18"
                  :r="radius"
                  :stroke="gaugeColor"
                  stroke-width="3"
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
              {{ isOverLimit ? remainingChars : remainingChars }}
            </span>
          </div>
        </div>
        
        <!-- エラーメッセージ -->
        <div class="h-6 mb-2">
          <p v-if="errors.body" class="text-red-500 text-sm">{{ errors.body }}</p>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="isPosting || isOverLimit"
            class="bg-purple-gradient hover:opacity-90 disabled:bg-gray-600 text-white py-2 px-6 rounded-full font-medium transition-all"
            :class="{ 'opacity-50': isOverLimit && !isPosting }"
          >
            {{ isPosting ? '投稿中...' : 'シェアする' }}
          </button>
        </div>
      </form>
    </div>
  </aside>
</template>