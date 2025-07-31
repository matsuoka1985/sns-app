export const useInfiniteScroll = () => {
  const isLoading = ref(false)
  const hasMore = ref(true)
  const currentPage = ref(1)
  
  // スクロール位置を監視してローディングをトリガー
  const handleScroll = (callback: () => Promise<void>, scrollElement?: HTMLElement) => {
    const scrollHandler = async () => {
      let scrollPosition: number
      let documentHeight: number
      
      if (scrollElement) {
        // 特定の要素内でのスクロール
        scrollPosition = scrollElement.scrollTop + scrollElement.clientHeight
        documentHeight = scrollElement.scrollHeight
      } else {
        // ページ全体のスクロール
        scrollPosition = window.innerHeight + window.scrollY
        documentHeight = document.documentElement.offsetHeight
      }
      
      const threshold = 200 // 下から200px以内でトリガー
      
      if (
        scrollPosition >= documentHeight - threshold &&
        !isLoading.value &&
        hasMore.value
      ) {
        await callback()
      }
    }
    
    // スクロールイベントリスナーを追加
    const targetElement = scrollElement || window
    targetElement.addEventListener('scroll', scrollHandler)
    
    // クリーンアップ関数を返す
    return () => {
      targetElement.removeEventListener('scroll', scrollHandler)
    }
  }
  
  // 次のページを読み込む
  const loadNextPage = async <T>(
    fetchFunction: (page: number) => Promise<{
      data: T[]
      pagination: {
        has_more_pages?: boolean
        has_next_page?: boolean
        current_page: number
      }
    }>
  ) => {
    if (isLoading.value || !hasMore.value) return { data: [], hasMore: false }
    
    isLoading.value = true
    
    try {
      const nextPage = currentPage.value + 1
      const response = await fetchFunction(nextPage)
      
      currentPage.value = response.pagination.current_page
      // どちらのフィールド名にも対応
      hasMore.value = response.pagination.has_more_pages ?? response.pagination.has_next_page ?? false
      
      return {
        data: response.data,
        hasMore: hasMore.value,
        pagination: response.pagination
      }
    } catch (error) {
      console.error('ページ読み込みエラー:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  // 状態をリセット（初期読み込み時など）
  const reset = () => {
    currentPage.value = 1
    hasMore.value = true
    isLoading.value = false
  }

  // hasMoreを手動で設定
  const setHasMore = (value: boolean) => {
    hasMore.value = value
  }
  
  return {
    isLoading: readonly(isLoading),
    hasMore: readonly(hasMore),
    currentPage: readonly(currentPage),
    handleScroll,
    loadNextPage,
    reset,
    setHasMore
  }
}