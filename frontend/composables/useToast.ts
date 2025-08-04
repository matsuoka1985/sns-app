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

export interface ToastConfig {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  defaultDuration: number
  maxToasts: number
  styles: {
    success: string
    error: string
    warning: string
    info: string
    base: string
  }
  icons: {
    success: string
    error: string
    warning: string
    info: string
  }
}

const defaultConfig: ToastConfig = {
  position: 'top-right',
  defaultDuration: 3000,
  maxToasts: 5,
  styles: {
    base: 'px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-80 max-w-96',
    success: 'bg-purple-gradient text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white'
  },
  icons: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
}

const toasts = ref<Toast[]>([])
const config = ref<ToastConfig>(defaultConfig)

export const useToast = () => {
  const updateConfig = (newConfig: Partial<ToastConfig>) => {
    config.value = { ...config.value, ...newConfig }
  }

  const showToast = (message: string, type: Toast['type'] = 'info', duration?: number, action?: ToastAction) => {
    const finalDuration = duration ?? config.value.defaultDuration
    const id = Date.now().toString()
    const toast: Toast = {
      id,
      message,
      type,
      duration: finalDuration,
      action
    }
    
    // 最大数制限
    if (toasts.value.length >= config.value.maxToasts) {
      toasts.value.shift()
    }
    
    toasts.value.push(toast)
    
    // 自動削除
    setTimeout(() => {
      removeToast(id)
    }, finalDuration)
    
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

  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = config.value.styles.base
    const typeStyles = config.value.styles[type]
    return `${baseStyles} ${typeStyles}`
  }

  const getToastIcon = (type: Toast['type']) => {
    return config.value.icons[type]
  }

  const getPositionClasses = () => {
    const position = config.value.position
    const baseClasses = 'fixed z-50 space-y-2'
    
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`
      case 'top-left':
        return `${baseClasses} top-4 left-4`
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`
      case 'bottom-center':
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2`
      default:
        return `${baseClasses} top-4 right-4`
    }
  }
  
  // 投稿成功時の標準トースト
  const postCreated = (postId: number) => success('投稿しました！', 5000, {
    label: '詳細を見る',
    to: `/posts/${postId}`
  })
  
  // コメント成功時の標準トースト
  const commentCreated = () => success('コメントしました！')
  
  return {
    toasts: readonly(toasts),
    config: readonly(config),
    updateConfig,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    postCreated,
    commentCreated,
    getToastStyles,
    getToastIcon,
    getPositionClasses
  }
}