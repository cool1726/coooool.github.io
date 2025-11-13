'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Post } from '@/lib/notion'

interface PostNavLinksProps {
  post: Post
  allPosts: Post[]
  defaultPrevPost: Post | null
  defaultNextPost: Post | null
}

export default function PostNavLinks({
  post,
  allPosts,
  defaultPrevPost,
  defaultNextPost,
}: PostNavLinksProps) {
  const searchParams = useSearchParams()
  const categoryFromQuery = searchParams?.get('category')
  const tagFromQuery = searchParams?.get('tag')
  const searchFromQuery = searchParams?.get('search')
  
  const category = categoryFromQuery ? decodeURIComponent(categoryFromQuery) : null
  const tag = tagFromQuery ? decodeURIComponent(tagFromQuery) : null
  const search = searchFromQuery ? decodeURIComponent(searchFromQuery) : null

  // 검색, 태그 또는 카테고리가 있으면 해당 필터 내에서만 이전/다음 글 찾기
  let prevPost = defaultPrevPost
  let nextPost = defaultNextPost

  if (search) {
    // 검색 결과 필터링
    const searchPosts = allPosts.filter((p) => {
      const titleMatch = p.title.toLowerCase().includes(search.toLowerCase())
      const tagMatch = p.tags && p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      const categoryMatch = p.category && p.category.toLowerCase().includes(search.toLowerCase())
      return titleMatch || tagMatch || categoryMatch
    })
    searchPosts.sort((a, b) => b.date.localeCompare(a.date))
    const currentIndex = searchPosts.findIndex((p) => p.slug === post.slug)
    
    if (currentIndex !== -1) {
      prevPost = currentIndex < searchPosts.length - 1 ? searchPosts[currentIndex + 1] : null
      nextPost = currentIndex > 0 ? searchPosts[currentIndex - 1] : null
    }
  } else if (tag) {
    // 태그 필터링
    const tagPosts = allPosts.filter((p) => p.tags && p.tags.includes(tag))
    tagPosts.sort((a, b) => b.date.localeCompare(a.date))
    const currentIndex = tagPosts.findIndex((p) => p.slug === post.slug)
    
    if (currentIndex !== -1) {
      prevPost = currentIndex < tagPosts.length - 1 ? tagPosts[currentIndex + 1] : null
      nextPost = currentIndex > 0 ? tagPosts[currentIndex - 1] : null
    }
  } else if (category) {
    // 카테고리 필터링
    const categoryPosts = allPosts.filter((p) => p.category === category)
    categoryPosts.sort((a, b) => b.date.localeCompare(a.date))
    const currentIndex = categoryPosts.findIndex((p) => p.slug === post.slug)
    
    if (currentIndex !== -1) {
      prevPost = currentIndex < categoryPosts.length - 1 ? categoryPosts[currentIndex + 1] : null
      nextPost = currentIndex > 0 ? categoryPosts[currentIndex - 1] : null
    }
  }

  // 쿼리 파라미터 구성
  const queryParams = []
  if (search) queryParams.push(`search=${encodeURIComponent(search)}`)
  if (tag) queryParams.push(`tag=${encodeURIComponent(tag)}`)
  if (category) queryParams.push(`category=${encodeURIComponent(category)}`)
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''

  return (
    <nav className="post-navigation">
      {prevPost && (
        <Link href={`/posts/${encodeURIComponent(prevPost.slug)}${queryString}`} className="post-nav-link post-nav-prev">
          <ChevronLeft className="post-nav-icon" size={20} />
          <div className="post-nav-content">
            <span className="post-nav-label">이전 글</span>
            <span className="post-nav-title">{prevPost.title}</span>
          </div>
        </Link>
      )}
      {nextPost && (
        <Link href={`/posts/${encodeURIComponent(nextPost.slug)}${queryString}`} className="post-nav-link post-nav-next">
          <div className="post-nav-content">
            <span className="post-nav-label">다음 글</span>
            <span className="post-nav-title">{nextPost.title}</span>
          </div>
          <ChevronRight className="post-nav-icon" size={20} />
        </Link>
      )}
    </nav>
  )
}

