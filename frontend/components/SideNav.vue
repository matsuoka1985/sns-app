<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
/* 開閉フラグ */
const showModal = ref(false)
const openModal = () => (showModal.value = true)
const closeModal = () => (showModal.value = false)

/* バリデーションスキーマ */
const validationSchema = toTypedSchema(
  yup.object({
    content: yup.string().required('投稿内容を入力してください').max(120, '120文字以内で入力してください')
  })
)

// vee-validateのフォーム設定
const { errors, defineField, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema: toTypedSchema(
    yup.lazy(() => 
      yup.object({
        content: yup.string().max(120, '120文字以内で入力してください')
      })
    )
  ),
  validateOnMount: false
})

const [content, contentAttrs] = defineField('content')
const isPosting = ref(false)

// 文字数カウント関連
const maxLength = 120
const currentLength = computed(() => content.value?.length || 0)
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
watch(content, () => {
  if (errors.value.content && currentLength.value <= maxLength) {
    setFieldError('content', undefined)
  }
})

// 親から新規投稿追加関数をinject
const addNewPost = inject<(post: any) => void>('addNewPost', () => {})

// トースト
const { success } = useToast()

const handlePost = async () => {
  // submit時のみバリデーション実行
  if (!content.value || content.value.trim() === '') {
    setFieldError('content', '投稿内容を入力してください')
    return
  }
  
  if (content.value.length > maxLength) {
    setFieldError('content', `${maxLength}文字以内で入力してください`)
    return
  }

  // バリデーション成功時はエラーをクリア
  setFieldError('content', undefined)

  isPosting.value = true
  try {
    const response = await $fetch('/api/posts', {
      method: 'POST',
      body: { content: content.value }
    })

    // レスポンスから新しい投稿データを取得して追加
    if (response.success && response.post) {
      addNewPost(response.post)
      
      // 投稿成功トーストに詳細リンクを追加
      success('投稿しました！', 5000, {
        label: '詳細を見る',
        to: `/posts/${response.post.id}`
      })
    }

    resetForm()
    closeModal()
  } finally {
    isPosting.value = false
  }
}

/* ログアウト */
async function handleLogout() {
  await $fetch('/api/auth/logout', {
    method: 'POST'
  })
  await navigateTo('/login')
}
</script>

<template>
  <!-- ===== 右下の Feather ボタン (モバイルのみ) ===== -->
  <button @click="openModal" class="md:hidden fixed bottom-4 right-4 z-50 p-3 bg-purple-gradient
           rounded-full shadow-lg border border-black" aria-label="投稿を開く">
    <img src="/images/feather.png" alt="open" class="w-6 h-6" />
  </button>

  <!-- ===== モーダル ===== -->
  <Teleport to="body">
    <transition name="fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center md:hidden">
        <div class="absolute inset-0 bg-black/60" @click="closeModal" />
        <div class="relative w-11/12 max-w-md bg-custom-dark rounded-lg p-6 z-10">
          <!-- ヘッダー -->
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-white text-lg font-medium">シェア</h2>
            <button class="bg-purple-gradient text-white p-1.5 rounded-full" @click="closeModal">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 投稿フォーム -->
          <form @submit.prevent="handlePost">
            <textarea
              v-model="content"
              v-bind="contentAttrs"
              :disabled="isPosting"
              placeholder="今何してる？"
              class="w-full h-32 p-3 bg-transparent border-2 border-white rounded-lg
                     text-white placeholder-gray-400 resize-none focus:outline-none"
            />
            
            <!-- 文字数ゲージと情報 -->
            <div v-if="currentLength > 0" class="flex items-center justify-between mt-2">
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
            <div class="h-6 mt-1">
              <p v-if="errors.content" class="text-red-500 text-sm">{{ errors.content }}</p>
            </div>

            <div class="flex justify-end mt-4 space-x-2">
              <BaseButton
                type="submit"
                size="sm"
                :loading="isPosting"
                :disabled="isPosting || isOverLimit"
                :class="{ 'opacity-50': isOverLimit && !isPosting }"
              >
                シェアする
              </BaseButton>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>

  <!-- ===== デスクトップ サイドバー ===== -->
  <aside class="hidden md:sticky md:top-0 md:flex flex-col h-screen w-96 bg-custom-dark p-6 overflow-y-auto">
    <img src="/images/logo.png" class="w-32 h-auto mb-8 object-contain" />
    <nav class="mb-8">
      <ul class="space-y-4">
        <li>
          <NuxtLink to="/" class="flex items-center space-x-3 text-white hover:text-gray-300 text-xl">
            <img src="/images/home.png" class="w-6 h-6"  />
            <span>ホーム</span>
          </NuxtLink>
        </li>
        <li>
          <button @click="handleLogout" class="flex items-center space-x-3 text-white hover:text-gray-300 text-xl w-full text-left">
            <img src="/images/logout.png" class="w-6 h-6"  />
            <span>ログアウト</span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- デスクトップ投稿フォーム -->
    <div class="flex-1 flex flex-col">
      <h2 class="text-white text-lg font-medium mb-4">シェア</h2>
      <form @submit.prevent="handlePost" class="flex-1 flex flex-col">
        <textarea
          v-model="content"
          v-bind="contentAttrs"
          :disabled="isPosting"
          placeholder="今何してる？"
          class="w-full h-32 p-4 bg-transparent border-2 border-white rounded-lg
                 text-white placeholder-gray-400 resize-none focus:outline-none"
        />
        
        <!-- 文字数ゲージと情報 -->
        <div v-if="currentLength > 0" class="flex items-center justify-between mt-2">
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
        <div class="h-6 mt-1">
          <p v-if="errors.content" class="text-red-500 text-sm">{{ errors.content }}</p>
        </div>

        <div class="flex justify-end mt-4">
          <BaseButton
            type="submit"
            size="sm"
            :loading="isPosting"
            :disabled="isPosting || isOverLimit"
            :class="{ 'opacity-50': isOverLimit && !isPosting }"
          >
            シェアする
          </BaseButton>
        </div>
      </form>
    </div>
  </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity .2s
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0
}
</style>