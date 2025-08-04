// 共通型定義
export interface User {
  id: number
  name: string
}

export interface Post {
  id: number
  body: string
  user: User
  likes_count: number
  created_at: string
  is_liked: boolean
  comments_count?: number
}

export interface Comment {
  id: number
  body: string
  user: User
  created_at: string
}