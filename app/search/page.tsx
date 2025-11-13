'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Post } from '@/lib/notion'

// 날짜 포맷팅 함수
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams?.get('q') || ''
  const [results, setResults] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function searchPosts() {
      if (!query.trim()) {
        setResults([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (!response.ok) {
          throw new Error('검색 실패')
        }
        const data = await response.json()
        setResults(data)
      } catch (error) {
        console.error('검색 오류:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    searchPosts()
  }, [query])

  return (
    <main className="home-container">
      <header className="home-header">
        <h1 className="categories-page-title">검색 결과</h1>
        {query && (
          <p className="search-query-text">"{query}"</p>
        )}
      </header>

      <section className="categories-section">
        {loading ? (
          <div className="loading-container">
            <p>검색 중...</p>
          </div>
        ) : query.trim() ? (
          results.length > 0 ? (
            <div className="selected-category-posts">
              <h2 className="selected-category-title">
                검색 결과
                <span className="category-post-count">({results.length})</span>
              </h2>
              <ul className="post-list">
                {results.map((post) => (
                  <li key={post.id} className="post-item">
                    <Link href={`/posts/${encodeURIComponent(post.slug)}?search=${encodeURIComponent(query)}`} className="post-link">
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
            </div>
          ) : (
            <p className="no-posts">검색 결과가 없습니다.</p>
          )
        ) : (
          <p className="no-posts">검색어를 입력해주세요.</p>
        )}
      </section>
    </main>
  )
}


