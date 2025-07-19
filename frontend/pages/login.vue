<template>
  <div>
    <button @click="loginWithGoogle">Googleでログイン</button>
  </div>
</template>

<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const { $firebaseAuth } = useNuxtApp()

const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  try {
    const result = await signInWithPopup($firebaseAuth, provider)
    console.log('ログイン成功:', result.user)
  } catch (err) {
    console.error('ログイン失敗:', err)
  }
}
</script>