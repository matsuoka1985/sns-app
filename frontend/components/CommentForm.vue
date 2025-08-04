<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'

interface Props {
  postId: number
  disabled?: boolean
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  modelValue: ''
});

const emit = defineEmits<{
  commentCreated: [comment: any]
  'update:modelValue': [value: string]
}>();

// コメント作成用の状態
const isCommenting = ref(false);
const isOverLimit = ref(false);

// バリデーションスキーマ
const validationSchema = toTypedSchema(
  yup.object({
    commentBody: yup.string().max(120, '120文字以内で入力してください')
  })
);

// vee-validateのフォーム設定
const { errors, defineField, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema,
  validateOnMount: false
});

const [commentBody, commentBodyAttrs] = defineField('commentBody')

// propsのmodelValueを監視してcommentBodyに同期
watch(() => props.modelValue, (newValue) => {
  commentBody.value = newValue || ''
}, { immediate: true })

// commentBodyの変更を親に通知
watch(commentBody, (newValue) => {
  emit('update:modelValue', newValue || '')
})

// 入力時にエラーをクリア
watch(commentBody, () => {
  if (errors.value.commentBody && commentBody.value && commentBody.value.length <= 120) {
    setFieldError('commentBody', undefined)
  }
})

// コメント作成処理
const createComment = handleSubmit(async () => {
  // submit時のみバリデーション実行
  const body = commentBody.value || ''
  if (!body || body.trim() === '') {
    setFieldError('commentBody', 'コメント内容を入力してください')
    return
  }

  if (body.length > 120) {
    return
  }

  isCommenting.value = true
  try {
    const response = await $fetch(`/api/posts/${props.postId}/comments`, {
      method: 'POST',
      body: { body: body.trim() }
    })

    if (response.success && response.comment) {
      emit('commentCreated', response.comment)
      resetForm()
      emit('update:modelValue', '') // 共有状態もクリア

      const { success } = useToast()
      success('コメントしました！')
    }
  } catch (error) {
    console.error('コメント作成エラー:', error)
    const { error: showErrorToast } = useToast()
    showErrorToast('コメントの作成に失敗しました')
  } finally {
    isCommenting.value = false
  }
})
</script>

<template>
  <form @submit.prevent="createComment" class="space-y-4">
    <PostTextarea
      v-model="commentBody"
      :disabled="disabled || isCommenting"
      placeholder="コメントを入力..."
      height="h-16"
      :error="errors.commentBody"
      @over-limit="isOverLimit = $event"
    />

    <div class="flex justify-end">
      <BaseButton
        type="submit"
        :disabled="!(commentBody || '').trim() || isOverLimit || disabled"
        :loading="isCommenting"
        loading-text="コメント中..."
        size="md"
      >
        コメント
      </BaseButton>
    </div>
  </form>
</template>