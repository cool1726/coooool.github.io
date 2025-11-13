'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Post } from '@/lib/notion'

const POSTS_PER_PAGE = 10

// 정적 생성용 (서버 컴포넌트에서만 사용 가능하므로 주석 처리)
// export async function generateStaticParams() {
//   const { getAllCategories } = await import('@/lib/notion')
//   const categories = await getAllCategories()
//   return categories.map((category) => ({
//     category: encodeURIComponent(category),
//   }))
// }

// 날짜 포맷팅 함수
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CategoryPage() {
  const params = useParams()
  const category = decodeURIComponent(params.category as string)
  const [posts, setPosts] = useState<Post[]>([])
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadPosts() {
      setLoading(true)
      try {
        const response = await fetch(`/api/categories/${encodeURIComponent(category)}`)
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        const allPosts: Post[] = await response.json()
        setPosts(allPosts)
        setDisplayedPosts(allPosts.slice(0, POSTS_PER_PAGE))
        setHasMore(allPosts.length > POSTS_PER_PAGE)
      } catch (error) {
        console.error('포스트 로딩 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [category])

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    
    setLoading(true)
    setTimeout(() => {
      const currentLength = displayedPosts.length
      const nextPosts = posts.slice(0, currentLength + POSTS_PER_PAGE)
      setDisplayedPosts(nextPosts)
      setHasMore(nextPosts.length < posts.length)
      setLoading(false)
    }, 300) // 로딩 애니메이션을 위한 약간의 지연
  }, [loading, hasMore, displayedPosts.length, posts])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading, loadMore])

  if (loading && displayedPosts.length === 0) {
    return (
      <main className="home-container">
        <div className="loading-container">
          <p>로딩 중...</p>
        </div>
      </main>
    )
  }

  if (displayedPosts.length === 0) {
    return (
      <main className="home-container">
        <header className="home-header">
          <h1 className="category-title">{category}</h1>
        </header>
        <section className="posts-section">
          <p className="no-posts">이 카테고리에 작성된 글이 없습니다.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="home-container">
      <header className="home-header">
        <h1 className="category-title">{category}</h1>
      </header>

      <section className="posts-section">
        <ul className="post-list">
          {displayedPosts.map((post) => (
            <li key={post.id} className="post-item">
              <Link href={`/posts/${encodeURIComponent(post.slug)}?category=${encodeURIComponent(category)}`} className="post-link">
                <div className="home-post-content">
                  <h2 className="post-title">{post.title}</h2>
                  <div className="post-meta">
                    <time className="post-date">{formatDate(post.date)}</time>
                  </div>
                  {post.tags && post.tags.length > 0 && (
                    <div className="post-tags">
                      {post.tags.map((tag, index) => (
                        <span key={index} className="post-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        
        {hasMore && (
          <div ref={observerTarget} className="loading-more-container">
            {loading && <p className="loading-more">로딩 중...</p>}
          </div>
        )}
      </section>
    </main>
  )
}

