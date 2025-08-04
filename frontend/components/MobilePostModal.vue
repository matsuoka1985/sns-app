<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'

interface Props {
  show: boolean
  postBody: string
  isPosting?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'update:postBody', value: string): void
  (e: 'submit'): void
}

const props = withDefaults(defineProps<Props>(), {
  isPosting: false
})

const emit = defineEmits<Emits>()

// 文字数超過フラグ
const isOverLimit = ref(false)

// バリデーションスキーマ
const validationSchema = toTypedSchema(
  yup.object({
    mobileBody: yup.string().max(120, '120文字以内で入力してください')
  })
)

// vee-validateのフォーム設定
const { errors, defineField, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema,
  validateOnMount: false
})

const [mobileBody, mobileBodyAttrs] = defineField('mobileBody')

// トースト機能
const { error: showErrorToast } = useToast()

// propsの変更を監視してフォームに反映
watch(() => props.postBody, (newValue) => {
  mobileBody.value = newValue
}, { immediate: true })

// フォームの変更を親に通知
watch(mobileBody, (newValue) => {
  emit('update:postBody', newValue || '')
})

// モーダルを閉じる
const closeModal = () => {
  emit('close')
}

// 投稿処理
const submitPost = handleSubmit(async () => {
  // submit時のみバリデーション実行
  if (!props.postBody || props.postBody.trim() === '') {
    setFieldError('mobileBody', '投稿内容を入力してください')
    return
  }
  
  if (props.postBody.length > 120) {
    return
  }

  emit('submit')
})

// モーダルが閉じられた時にフォームをリセット
watch(() => props.show, (newShow) => {
  if (!newShow) {
    resetForm()
  }
})
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 md:hidden">
    <div class="absolute inset-0 bg-black/60" @click="closeModal"></div>
    <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-custom-dark rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-white text-lg font-medium">シェア</h2>
        <button @click="closeModal" class="text-gray-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 投稿フォーム -->
      <form @submit.prevent="submitPost">
        <PostTextarea
          v-model="mobileBody"
          :disabled="isPosting"
          placeholder="今何してる？"
          height="h-32"
          :error="errors.mobileBody"
          @over-limit="isOverLimit = $event"
          class="mb-4"
        />
        
        <div class="flex justify-end">
          <BaseButton
            type="submit"
            :disabled="isPosting || isOverLimit"
            :loading="isPosting"
            loading-text="投稿中..."
            size="md"
          >
            シェアする
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>