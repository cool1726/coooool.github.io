'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Post } from '@/lib/notion'

interface SearchBarProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const searchPosts = async () => {
      if (!query.trim()) {
        setResults([])
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

    const debounceTimer = setTimeout(searchPosts, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  const handleResultClick = (post: Post) => {
    router.push(`/posts/${encodeURIComponent(post.slug)}?search=${encodeURIComponent(query)}`)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="search-overlay" onClick={handleOverlayClick}>
      <div className="search-bar-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-bar-header">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="검색어를 입력하세요..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose()
                }
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="search-clear-button"
                aria-label="검색어 지우기"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="search-close-button"
            aria-label="검색 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="search-results">
          {loading ? (
            <div className="search-loading">
              <p>검색 중...</p>
            </div>
          ) : query.trim() ? (
            results.length > 0 ? (
              <ul className="search-results-list">
                {results.map((post) => (
                  <li
                    key={post.id}
                    className="search-result-item"
                    onClick={() => handleResultClick(post)}
                  >
                    <h3 className="search-result-title">{post.title}</h3>
                    {post.category && (
                      <span className="search-result-category">{post.category}</span>
                    )}
                    {post.tags && post.tags.length > 0 && (
                      <div className="search-result-tags">
                        {post.tags.map((tag, index) => (
                          <span key={index} className="search-result-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="search-no-results">
                <p>검색 결과가 없습니다.</p>
              </div>
            )
          ) : (
            <div className="search-empty">
              <p>검색어를 입력하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

