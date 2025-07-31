<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'

interface Props {
  postId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submitted: [comment: any]
}>()

/* バリデーションスキーマ */
const validationSchema = toTypedSchema(
  yup.object({
    content: yup.string().required('コメント内容を入力してください').max(120, '120文字以内で入力してください')
  })
)

// vee-validateのフォーム設定
const { errors, defineField, handleSubmit, resetForm } = useForm({
  validationSchema,
  validateOnMount: false
})

const [content, contentAttrs] = defineField('content', {
  validateOnBlur: false,
  validateOnChange: false,
  validateOnInput: false
})

const isSubmitting = ref(false)

// トースト機能
const { success: showSuccessToast, error: showErrorToast } = useToast()

const handleComment = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    const response = await $fetch(`/api/posts/${props.postId}/comments`, {
      baseURL: 'http://localhost',
      method: 'POST',
      body: { content: values.content },
      credentials: 'include',
    })
    
    if (response.success && response.comment) {
      emit('submitted', response.comment)
      resetForm()
      showSuccessToast('コメントを投稿しました')
    } else {
      showErrorToast('コメントの投稿に失敗しました')
    }
  } catch (error) {
    console.error('コメント投稿エラー:', error)
    showErrorToast('ネットワークエラーが発生しました')
  } finally { 
    isSubmitting.value = false 
  }
})
</script>

<template>
  <div class="bg-custom-dark p-4">
    
    <form @submit.prevent="handleComment">
      <textarea 
        v-model="content" 
        v-bind="contentAttrs"
        maxlength="120" 
        :disabled="isSubmitting" 
        placeholder="コメントを入力..."
        class="w-full h-20 p-3 bg-transparent border-2 border-white rounded-lg
               text-white placeholder-gray-400 resize-none focus:outline-none text-sm"
      />
      <!-- エラーメッセージ -->
      <p v-if="errors.content" class="text-red-500 text-sm mt-1">{{ errors.content }}</p>

      <div class="flex justify-end mt-3">
        <BaseButton 
          type="submit"
          size="sm" 
          :loading="isSubmitting" 
          :disabled="isSubmitting"
        >
          コメント
        </BaseButton>
      </div>
    </form>
  </div>
</template>