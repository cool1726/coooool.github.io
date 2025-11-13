'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Post } from '@/lib/notion'

interface CategoryWithCount {
  name: string
  count: number
}

// 날짜 포맷팅 함수
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CategoriesPage() {
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch('/api/categories')
        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }
        const categoriesWithCounts: CategoryWithCount[] = await response.json()
        setCategories(categoriesWithCounts)
        
        // URL 쿼리 파라미터에서 카테고리 확인
        const categoryFromQuery = searchParams?.get('category')
        if (categoryFromQuery) {
          const decodedCategory = decodeURIComponent(categoryFromQuery)
          // 카테고리 목록에 존재하는지 확인
          const categoryExists = categoriesWithCounts.some(c => c.name === decodedCategory)
          if (categoryExists) {
            setSelectedCategory(decodedCategory)
          } else if (categoriesWithCounts.length > 0) {
            // 존재하지 않으면 첫 번째 카테고리 선택
            setSelectedCategory(categoriesWithCounts[0].name)
          }
        } else {
          // 쿼리 파라미터가 없으면 첫 번째 카테고리를 기본 선택
          if (categoriesWithCounts.length > 0) {
            setSelectedCategory(categoriesWithCounts[0].name)
          }
        }
      } catch (error) {
        console.error('카테고리 로딩 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [searchParams])

  useEffect(() => {
    async function loadPosts() {
      if (!selectedCategory) {
        setPosts([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/categories?category=${encodeURIComponent(selectedCategory)}`)
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        const categoryPosts: Post[] = await response.json()
        // 최신순으로 정렬 (날짜 기준 내림차순)
        categoryPosts.sort((a, b) => b.date.localeCompare(a.date))
        setPosts(categoryPosts)
      } catch (error) {
        console.error('포스트 로딩 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [selectedCategory])

  return (
    <main className="home-container">
      <header className="home-header">
        <h1 className="categories-page-title">카테고리</h1>
      </header>

      <section className="categories-section">
        {/* 카테고리 선택 UI */}
        <div className="category-list">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`category-list-item ${selectedCategory === category.name ? 'active' : ''}`}
            >
              <span className="category-list-name">{category.name}</span>
              <span className="category-list-count">{category.count}개</span>
            </button>
          ))}
        </div>

        {/* 선택한 카테고리의 포스트 목록 */}
        {loading ? (
          <div className="loading-container">
            <p>로딩 중...</p>
          </div>
        ) : selectedCategory ? (
          <div className="selected-category-posts">
            <h2 className="selected-category-title">
              {selectedCategory}
              <span className="category-post-count">({posts.length})</span>
            </h2>
            {posts.length === 0 ? (
              <p className="no-posts">이 카테고리에 작성된 글이 없습니다.</p>
            ) : (
              <ul className="post-list">
                {posts.map((post) => (
                  <li key={post.id} className="post-item">
                    <Link href={`/posts/${encodeURIComponent(post.slug)}?category=${encodeURIComponent(selectedCategory)}`} className="post-link">
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
            )}
          </div>
        ) : (
          <p className="no-posts">카테고리를 선택해주세요.</p>
        )}
      </section>
    </main>
  )
}

