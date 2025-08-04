<script setup lang="ts">
const { toasts, removeToast, getToastStyles, getToastIcon, getPositionClasses } = useToast()
</script>

<template>
  <Teleport to="body">
    <div :class="getPositionClasses()">
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
          <span class="text-lg">{{ getToastIcon(toast.type) }}</span>
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