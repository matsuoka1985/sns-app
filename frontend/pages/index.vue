<template>
  <div class="p-8">
    <h1 class="text-xl font-bold">Firebase Connected</h1>
    <p>Check your browser console for Firebase Analytics init logs.</p>
  </div>
</template>

<script setup lang="ts">
// Firebase プラグインが読み込まれていれば、Analytics の初期化も完了してる
console.log("Firebase initialized");
</script>