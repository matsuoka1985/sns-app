<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'

// Props
interface Props {
  postBody: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  newPost: [post: any]
  updateBody: [body: string]
}>()

// 新規投稿用の状態
const isPosting = ref(false)
const isOverLimit = ref(false)

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


// 入力時にエラーをクリア
watch(body, () => {
  if (errors.value.body && body.value && body.value.length <= 120) {
    setFieldError('body', undefined)
  }
})

// 投稿作成処理
const createPost = handleSubmit(async () => {
  // submit時のみバリデーション実行
  if (!body.value || body.value.trim() === '') {
    setFieldError('body', '投稿内容を入力してください')
    return
  }
  
  if (body.value.length > 120) {
    setFieldError('body', '120文字以内で入力してください')
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
      
      const { postCreated } = useToast()
      postCreated(response.post.id)
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
  <div class="flex-1 flex flex-col">
    <h2 class="text-white text-lg mb-4">シェア</h2>
    <form @submit.prevent="createPost" class="flex-1 flex flex-col">
      <PostTextarea
        v-model="body"
        :disabled="isPosting"
        placeholder="今何してる？"
        height="h-32"
        :error="errors.body"
        class="mb-4"
        @over-limit="isOverLimit = $event"
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
</template>