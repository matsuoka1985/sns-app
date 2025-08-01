<script setup lang="ts">
import { useForm } from 'vee-validate' // vee-validate の Composition API
import { toTypedSchema } from '@vee-validate/yup' // yup スキーマを型安全に渡すヘルパ
import * as yup from 'yup' // バリデーション定義用ライブラリ

// emit で親へ成功イベントを送るための型定義
interface Emits {
  (e: 'success'): void
}

const emit = defineEmits<Emits>(); // Composition API でイベント定義

// useForm: バリデーション＋フォーム状態を一括で管理
const { errors, defineField, handleSubmit } = useForm({
  validationSchema: toTypedSchema(
    yup.object({
      email: yup
        .string()
        .required('メールアドレスは必須です')
        .email('正しいメールアドレスを入力してください'),
      password: yup
        .string()
        .required('パスワードは必須です')
        .min(6, 'パスワードは6文字以上で入力してください')
    })
  )
});

// フィールド定義
const [email] = defineField('email');     // v-model 代わりに各フィールドをバインド
const [password] = defineField('password');

// 状態管理
const isLoading = ref<boolean>(false); // 送信中フラグ
const errorMessage = ref<string>('');  // API からのエラー表示用

// handleSubmit: VeeValidate がバリデーション後に values を渡してくれる
const onSubmit = handleSubmit(async (values) => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    // Firebase Authenticationでログイン
    const { $firebaseAuth } = useNuxtApp() // Nuxt のプラグインインジェクション
    const auth = $firebaseAuth

    const { signInWithEmailAndPassword } = await import('firebase/auth')
    const userCredential = await signInWithEmailAndPassword(
      auth,
      values.email,
      values.password
    )

    const firebaseUser = userCredential.user

    // Firebase認証情報をコンソールに表示
    console.log('🔥 Firebase ログイン成功:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName
    })

    // Firebase IDトークンを取得してコンソールに表示
    const idToken = await firebaseUser.getIdToken()
    console.log('🎫 Firebase IDトークン:', idToken)

    // Nuxt API routeでHttpOnly Cookieを設定
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        idToken: idToken
      }
    })

    // APIレスポンスをコンソールに表示
    console.log('📡 Nuxt API レスポンス:', response)

    if (response.success) {
      console.log('✅ ログイン成功! HttpOnly Cookie設定完了:', response.user)
      
      // ログイン成功をemitで親コンポーネントに通知
      emit('success')
      
    } else {
      console.log('❌ ログイン失敗:', response.error)
      errorMessage.value = response.error || 'ログインに失敗しました'
    }

  } catch (error: any) {
    console.error('Login error:', error)
    errorMessage.value = 'メールアドレスまたはパスワードが正しくありません'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-center text-xl font-bold text-gray-900 mb-8">
      ログイン
    </h2>

    <!-- @submit で onSubmit を呼び出し、v-model で双方向バインディング -->
    <form @submit="onSubmit" class="space-y-5">
      <!-- BaseInput: 共通入力コンポーネント。v-model は modelValue / update:modelValue を内部で扱う -->
      <!-- メールアドレス -->
      <BaseInput
        name="email"
        type="email"
        placeholder="メールアドレス"
        v-model="email"
        :error-message="errors.email"
      />

      <!-- パスワード -->
      <BaseInput
        name="password"
        type="password"
        placeholder="パスワード"
        v-model="password"
        :error-message="errors.password"
        :minlength="6"
      />

      <!-- エラーメッセージ -->
      <div v-if="errorMessage" class="text-red-500 text-sm text-center px-4">
        {{ errorMessage }}
      </div>

      <!-- ログインボタン -->
      <div class="pt-4 flex justify-center">
        <!-- BaseButton はスロットでラベル、loading prop でスピナー制御 -->
        <BaseButton
          type="submit"
          :loading="isLoading"
          loading-text="ログイン中..."
        >
          ログイン
        </BaseButton>
      </div>
    </form>
  </div>
</template>