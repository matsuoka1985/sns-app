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
      name: yup
        .string()
        .required('ユーザーネームは必須です')
        .max(20, 'ユーザーネームは20文字以内で入力してください'),
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
const [name] = defineField('name');     // v-model 代わりに各フィールドをバインド
const [email] = defineField('email');
const [password] = defineField('password');

// 状態管理
const isLoading = ref<boolean>(false); // 送信中フラグ
const errorMessage = ref<string>('');  // API からのエラー表示用

// handleSubmit: VeeValidate がバリデーション後に values を渡してくれる
const onSubmit = handleSubmit(async (values) => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    // Firebase Authenticationで会員登録
    const { $firebaseAuth } = useNuxtApp() // Nuxt のプラグインインジェクション
    const auth = $firebaseAuth

    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      values.email,
      values.password
    )

    const firebaseUser = userCredential.user

    // Firebase認証情報をコンソールに表示
    console.log('🔥 Firebase認証成功:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName
    })

    // Firebase IDトークンを取得してコンソールに表示
    const idToken = await firebaseUser.getIdToken()
    console.log('🎫 Firebase IDトークン:', idToken)

    // Laravel APIに会員情報を送信
    const response = await $fetch('http://localhost/api/auth/register', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        firebase_uid: firebaseUser.uid,
        name: values.name,
        email: values.email,
        password: values.password
      }
    })

    // APIレスポンスをコンソールに表示
    console.log('📡 Laravel API レスポンス:', response)

    if (response.success) {
      console.log('✅ 新規登録成功!', response.user || response)
      
      // Firebase Admin SDK でトークンを検証してHTTP-Only Cookieを設定
      try {
        const verifyResponse = await $fetch('http://localhost/api/auth/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            idToken: idToken
          },
          credentials: 'include'
        })

        if (verifyResponse.success) {
          console.log('🔒 Firebase Admin SDK 検証成功 + HTTP-Only Cookie設定完了')
          console.log('👤 検証済みユーザー:', verifyResponse.user)
          
          // 古いクライアントサイドCookieを削除
          const oldAuthCookie = useCookie('firebase-auth-token')
          oldAuthCookie.value = null
          
          // 登録成功をemitで親コンポーネントに通知
          emit('success')
        } else {
          console.log('❌ Firebase Admin SDK 検証失敗:', verifyResponse.error)
          errorMessage.value = 'トークンの検証に失敗しました'
        }
      } catch (verifyError) {
        console.error('Firebase Admin SDK 検証エラー:', verifyError)
        errorMessage.value = 'セキュリティ検証に失敗しました'
      }
      
    } else {
      console.log('❌ 新規登録失敗:', response.error)
      errorMessage.value = response.error || '登録に失敗しました'
    }

  } catch (error: any) {
    console.error('Registration error:', error)
    errorMessage.value = 'エラーが発生しました。もう一度お試しください。'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-center text-xl font-bold text-gray-900 mb-8">
      新規登録
    </h2>

    <!-- @submit で onSubmit を呼び出し、v-model で双方向バインディング -->
    <form @submit="onSubmit" class="space-y-5">
      <!-- BaseInput: 共通入力コンポーネント。v-model は modelValue / update:modelValue を内部で扱う -->
      <!-- ユーザーネーム -->
      <BaseInput
        name="name"
        type="text"
        placeholder="ユーザーネーム"
        v-model="name"
        :error-message="errors.name"
        :maxlength="20"
      />

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

      <!-- 登録ボタン -->
      <div class="pt-4 flex justify-center">
        <!-- BaseButton はスロットでラベル、loading prop でスピナー制御 -->
        <BaseButton
          type="submit"
          :loading="isLoading"
          loading-text="送信中..."
        >
          新規登録
        </BaseButton>
      </div>
    </form>
  </div>
</template>