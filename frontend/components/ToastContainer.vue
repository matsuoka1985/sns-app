<script setup lang="ts">
const { toasts, removeToast } = useToast()

const getToastStyles = (type: string) => {
  const baseStyles = 'px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-80 max-w-96'
  
  switch (type) {
    case 'success':
      return `${baseStyles} bg-purple-gradient text-white`
    case 'error':
      return `${baseStyles} bg-red-600 text-white`
    case 'warning':
      return `${baseStyles} bg-yellow-600 text-white`
    case 'info':
      return `${baseStyles} bg-blue-600 text-white`
    default:
      return `${baseStyles} bg-gray-600 text-white`
  }
}

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return '✅'
    case 'error':
      return '❌'
    case 'warning':
      return '⚠️'
    case 'info':
      return 'ℹ️'
    default:
      return '📢'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <TransitionGroup
        name="toast"
        tag="div"
        class="space-y-2"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="getToastStyles(toast.type)"
        >
          <span class="text-lg">{{ getIcon(toast.type) }}</span>
          <div class="flex-1">
            <span>{{ toast.message }}</span>
            <div v-if="toast.action" class="mt-2">
              <NuxtLink
                v-if="toast.action.to"
                :to="toast.action.to"
                class="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
                @click="removeToast(toast.id)"
              >
                {{ toast.action.label }}
              </NuxtLink>
              <button
                v-else-if="toast.action.action"
                @click="toast.action.action(); removeToast(toast.id)"
                class="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
              >
                {{ toast.action.label }}
              </button>
            </div>
          </div>
          <button
            @click="removeToast(toast.id)"
            class="text-white hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>