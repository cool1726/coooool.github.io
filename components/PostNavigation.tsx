'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { Post } from '@/lib/notion'

interface PostNavigationProps {
  post: Post
  allPosts: Post[]
  defaultPrevPost: Post | null
  defaultNextPost: Post | null
}

export default function PostNavigation({
  post,
  allPosts,
  defaultPrevPost,
  defaultNextPost,
}: PostNavigationProps) {
  const searchParams = useSearchParams()
  const categoryFromQuery = searchParams?.get('category')
  const category = categoryFromQuery ? decodeURIComponent(categoryFromQuery) : (post.category || null)

  // 카테고리가 있으면 해당 카테고리 내에서만 이전/다음 글 찾기
  let prevPost = defaultPrevPost
  let nextPost = defaultNextPost

  if (category) {
    const categoryPosts = allPosts.filter((p) => p.category === category)
    categoryPosts.sort((a, b) => b.date.localeCompare(a.date))
    const currentIndex = categoryPosts.findIndex((p) => p.slug === post.slug)
    
    if (currentIndex !== -1) {
      prevPost = currentIndex < categoryPosts.length - 1 ? categoryPosts[currentIndex + 1] : null
      nextPost = currentIndex > 0 ? categoryPosts[currentIndex - 1] : null
    }
  }

  // 목록으로 돌아가기 링크 결정
  const backLink = category ? `/categories?category=${encodeURIComponent(category)}` : '/'

  return (
    <>
      <Link href={backLink} className="back-link">
        <ArrowLeft size={18} className="back-link-icon" />
        목록으로 돌아가기
      </Link>
      <nav className="post-navigation">
        {prevPost && (
          <Link href={`/posts/${encodeURIComponent(prevPost.slug)}${category ? `?category=${encodeURIComponent(category)}` : ''}`} className="post-nav-link post-nav-prev">
            <ChevronLeft className="post-nav-icon" size={20} />
            <div className="post-nav-content">
              <span className="post-nav-label">이전 글</span>
              <span className="post-nav-title">{prevPost.title}</span>
            </div>
          </Link>
        )}
        {nextPost && (
          <Link href={`/posts/${encodeURIComponent(nextPost.slug)}${category ? `?category=${encodeURIComponent(category)}` : ''}`} className="post-nav-link post-nav-next">
            <div className="post-nav-content">
              <span className="post-nav-label">다음 글</span>
              <span className="post-nav-title">{nextPost.title}</span>
            </div>
            <ChevronRight className="post-nav-icon" size={20} />
          </Link>
        )}
      </nav>
    </>
  )
}

