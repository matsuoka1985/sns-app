<script setup lang="ts">
interface Props {
  message?: string
  centered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  centered: true
})
</script>

<template>
  <div 
    v-if="message" 
    class="text-red-500 text-sm px-4"
    :class="{ 'text-center': centered }"
  >
    {{ message }}
  </div>
</template>