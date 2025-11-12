'use client'

import { useEffect, useState } from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

// 텍스트를 slug로 변환하는 함수
function textToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-가-힣]/g, '') // 특수문자 제거
    .replace(/[\s_-]+/g, '-') // 공백, 언더스코어, 하이픈을 하이픈으로 통일
    .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
}

export function useToc(content: string) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // 실제 DOM에서 헤딩 추출
    const postBody = document.querySelector('.post-body')
    if (!postBody) return

    const headings = postBody.querySelectorAll('h1, h2, h3')
    
    const tocItems: TocItem[] = []
    const usedIds = new Set<string>()
    
    headings.forEach((heading) => {
      const text = heading.textContent || ''
      let baseId = textToSlug(text)
      
      // 중복 ID 처리
      let id = baseId
      let counter = 1
      while (usedIds.has(id)) {
        id = `${baseId}-${counter}`
        counter++
      }
      usedIds.add(id)
      
      heading.id = id
      tocItems.push({
        id,
        text,
        level: parseInt(heading.tagName.charAt(1)),
      })
    })
    
    setToc(tocItems)

    // 스크롤 함수
    const scrollToSection = (hashId: string) => {
      const targetElement = document.getElementById(hashId)
      if (targetElement) {
        const elementPosition = targetElement.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - 100
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
        setActiveId(hashId)
      }
    }

    // URL 해시가 있으면 해당 섹션으로 스크롤
    if (window.location.hash) {
      const hashId = window.location.hash.substring(1)
      setTimeout(() => {
        scrollToSection(hashId)
      }, 100)
    }

    // URL 해시 변경 감지
    const handleHashChange = () => {
      const hashId = window.location.hash.substring(1)
      if (hashId) {
        scrollToSection(hashId)
      }
    }

    window.addEventListener('hashchange', handleHashChange)

    // 스크롤 시 현재 섹션 감지
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100
      
      for (let i = tocItems.length - 1; i >= 0; i--) {
        const element = document.getElementById(tocItems[i].id)
        if (element && element.offsetTop <= scrollPosition) {
          const newActiveId = tocItems[i].id
          setActiveId((prevActiveId) => {
            if (prevActiveId !== newActiveId) {
              // URL 해시 업데이트 (스크롤로 인한 변경은 replaceState 사용)
              if (window.location.hash !== `#${newActiveId}`) {
                window.history.replaceState(null, '', `#${newActiveId}`)
              }
              return newActiveId
            }
            return prevActiveId
          })
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // 초기 실행

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [content])

  const handleTocClick = (item: TocItem) => {
    const element = document.getElementById(item.id)
    if (element) {
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - 100
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      
      // URL 해시 업데이트 (pushState로 히스토리 추가)
      window.history.pushState(null, '', `#${item.id}`)
      
      // 활성 상태 즉시 업데이트
      setActiveId(item.id)
    }
  }

  return { toc, activeId, handleTocClick }
}

