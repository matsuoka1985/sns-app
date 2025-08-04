<template>
  <div 
    class="animate-spin rounded-full border-2 border-white border-t-transparent mx-auto"
    :class="sizeClasses"
  ></div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }
  return sizes[props.size]
})
</script>