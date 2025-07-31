export interface ToastAction {
  label: string
  to?: string
  action?: () => void
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: ToastAction
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const showToast = (message: string, type: Toast['type'] = 'info', duration = 3000, action?: ToastAction) => {
    const id = Date.now().toString()
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      action
    }
    
    toasts.value.push(toast)
    
    // 自動削除
    setTimeout(() => {
      removeToast(id)
    }, duration)
    
    return id
  }
  
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const success = (message: string, duration?: number, action?: ToastAction) => showToast(message, 'success', duration, action)
  const error = (message: string, duration?: number, action?: ToastAction) => showToast(message, 'error', duration, action)
  const warning = (message: string, duration?: number, action?: ToastAction) => showToast(message, 'warning', duration, action)
  const info = (message: string, duration?: number, action?: ToastAction) => showToast(message, 'info', duration, action)
  
  return {
    toasts: readonly(toasts),
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}