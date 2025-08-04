<script setup lang="ts">
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

// PostFormから投稿イベントを受け取る
const handleNewPost = (post: any) => {
  emit('newPost', post)
}

const handleUpdateBody = (body: string) => {
  emit('updateBody', body)
}
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
    <PostForm 
      :postBody="props.postBody"
      @newPost="handleNewPost"
      @updateBody="handleUpdateBody"
    />
  </aside>
</template>