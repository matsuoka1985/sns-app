<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()

const emit = defineEmits<{
  submit: [event: Event]
}>()

const handleSubmit = (event: Event) => {
  emit('submit', event)
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-center text-xl font-bold text-gray-900 mb-8">
      {{ title }}
    </h2>

    <form @submit="handleSubmit" class="space-y-5">
      <slot />
      
      <div class="pt-4 flex justify-center">
        <slot name="button" />
      </div>
    </form>
  </div>
</template>