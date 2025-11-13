'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Post } from '@/lib/notion'

interface TagWithCount {
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

export default function TagsPage() {
  const searchParams = useSearchParams()
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const tagsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadTags() {
      try {
        const response = await fetch('/api/tags')
        if (!response.ok) {
          throw new Error('Failed to fetch tags')
        }
        const tagsWithCounts: TagWithCount[] = await response.json()
        setTags(tagsWithCounts)
        
        // URL 쿼리 파라미터에서 태그 확인
        const tagFromQuery = searchParams?.get('tag')
        if (tagFromQuery) {
          const decodedTag = decodeURIComponent(tagFromQuery)
          // 태그 목록에 존재하는지 확인
          const tagExists = tagsWithCounts.some(t => t.name === decodedTag)
          if (tagExists) {
            setSelectedTag(decodedTag)
          } else if (tagsWithCounts.length > 0) {
            // 존재하지 않으면 첫 번째 태그 선택
            setSelectedTag(tagsWithCounts[0].name)
          }
        } else {
          // 쿼리 파라미터가 없으면 첫 번째 태그를 기본 선택
          if (tagsWithCounts.length > 0) {
            setSelectedTag(tagsWithCounts[0].name)
          }
        }
      } catch (error) {
        console.error('태그 로딩 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTags()
  }, [searchParams])

  useEffect(() => {
    async function loadPosts() {
      if (!selectedTag) {
        setPosts([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/tags?tag=${encodeURIComponent(selectedTag)}`)
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        const tagPosts: Post[] = await response.json()
        // 최신순으로 정렬 (날짜 기준 내림차순)
        tagPosts.sort((a, b) => b.date.localeCompare(a.date))
        setPosts(tagPosts)
      } catch (error) {
        console.error('포스트 로딩 오류:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [selectedTag])

  const [shouldShowToggle, setShouldShowToggle] = useState(false)

  // 태그 컨테이너의 높이를 확인하여 8줄 이상인지 판단
  useEffect(() => {
    const checkHeight = () => {
      if (tagsContainerRef.current) {
        const container = tagsContainerRef.current
        // 컨테이너의 실제 높이 확인
        const actualHeight = container.scrollHeight
        const maxHeight = 256 // 8줄 높이 (CSS에서 정의한 값)
        
        // 8줄 이상이면 토글 버튼 표시
        setShouldShowToggle(actualHeight > maxHeight)
        
        // 접혀있을 때만 높이 제한
        if (!isExpanded && actualHeight > maxHeight) {
          container.style.maxHeight = `${maxHeight}px`
          container.style.overflow = 'hidden'
        } else {
          container.style.maxHeight = 'none'
          container.style.overflow = 'visible'
        }
      }
    }
    
    if (tags.length > 0) {
      // 약간의 지연을 두어 DOM이 렌더링된 후 확인
      const timeoutId = setTimeout(checkHeight, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [tags, isExpanded])

  return (
    <main className="home-container">
      <header className="home-header">
        <h1 className="categories-page-title">태그</h1>
      </header>

      <section className="categories-section">
        {/* 태그 선택 UI */}
        <div className="tags-section-header">
          <div className="tags-header-info">
            <span className="tags-total-count">총 {tags.length}개</span>
            {shouldShowToggle && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="tags-toggle-button"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={16} />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    펼치기
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div 
          ref={tagsContainerRef}
          className={`tags-container ${isExpanded ? 'expanded' : ''}`}
        >
          {tags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => setSelectedTag(tag.name)}
              className={`tag-button ${selectedTag === tag.name ? 'active' : ''}`}
            >
              <span className="tag-name">{tag.name}</span>
              <span className="tag-count">({tag.count})</span>
            </button>
          ))}
        </div>

        {/* 선택한 태그의 포스트 목록 */}
        {loading ? (
          <div className="loading-container">
            <p>로딩 중...</p>
          </div>
        ) : selectedTag ? (
          <div className="selected-category-posts">
            <h2 className="selected-category-title">
              {selectedTag}
              <span className="category-post-count">({posts.length})</span>
            </h2>
            {posts.length === 0 ? (
              <p className="no-posts">이 태그가 포함된 글이 없습니다.</p>
            ) : (
              <ul className="post-list">
                {posts.map((post) => (
                  <li key={post.id} className="post-item">
                    <Link href={`/posts/${encodeURIComponent(post.slug)}?tag=${encodeURIComponent(selectedTag)}`} className="post-link">
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
          <p className="no-posts">태그를 선택해주세요.</p>
        )}
      </section>
    </main>
  )
}

