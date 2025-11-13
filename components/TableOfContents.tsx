'use client'

import { useEffect, useState, useRef } from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: string
}

// 텍스트를 ID로 변환하는 함수 (한국어, 영어, 숫자 유지)
function textToId(text: string): string {
  return text
    .trim()
    .replace(/[\s_-]+/g, '-') // 공백, 언더스코어, 하이픈을 하이픈으로 통일
    .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [isFloating, setIsFloating] = useState<boolean>(false)
  const tocRef = useRef<HTMLElement | null>(null)
  
  // 스크롤에 따라 floating 상태 관리 및 위치 설정
  useEffect(() => {
    const updateTocPosition = () => {
      // 본문 시작 위치 찾기
      const postBody = document.querySelector('.post-body-desktop') || document.querySelector('.post-body')
      const tocElement = tocRef.current
      
      if (!postBody || !tocElement) return
      
      const postBodyRect = postBody.getBoundingClientRect()
      const scrollY = window.scrollY
      const postBodyTop = postBodyRect.top + scrollY
      
      // 본문 콘텐츠 영역의 우측 끝 위치 계산
      const contentElement = document.querySelector('.post-content-desktop') as HTMLElement
      const wrapperElement = document.querySelector('.post-content-wrapper') as HTMLElement
      if (!contentElement || !wrapperElement) return
      
      const contentRect = contentElement.getBoundingClientRect()
      const wrapperRect = wrapperElement.getBoundingClientRect()
      
      // 본문 시작 위치를 넘어가면 floating
      if (scrollY + 100 >= postBodyTop) {
        setIsFloating(true)
        // floating 상태일 때는 fixed positioning (본문 우측 끝에서 72px)
        const contentRightFixed = contentRect.right // 현재 화면 기준
        tocElement.style.position = 'fixed'
        tocElement.style.top = '100px'
        tocElement.style.left = `${contentRightFixed + 72}px`
        tocElement.style.right = ''
      } else {
        setIsFloating(false)
        // absolute일 때는 부모(wrapper) 기준으로 계산 (본문 우측 끝에서 72px)
        const postBodyTopPosition = postBodyRect.top + scrollY
        const contentRightAbsolute = contentRect.right + scrollY // 절대 위치
        const wrapperLeftAbsolute = wrapperRect.left + scrollY // 부모의 절대 위치
        const leftRelativeToWrapper = contentRightAbsolute - wrapperLeftAbsolute + 72 // 부모 기준 상대 위치
        tocElement.style.position = 'absolute'
        tocElement.style.top = `${postBodyTopPosition}px`
        tocElement.style.left = `${leftRelativeToWrapper}px`
        tocElement.style.right = ''
      }
    }
    
    const handleResize = () => {
      updateTocPosition()
    }
    
    // 초기 위치 설정 - 여러 번 시도하여 확실히 설정
    const initPosition = () => {
      updateTocPosition()
      // DOM이 완전히 로드될 때까지 대기
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateTocPosition)
      }
    }
    
    // 즉시 실행 및 약간의 지연 후 재실행
    initPosition()
    setTimeout(updateTocPosition, 0)
    setTimeout(updateTocPosition, 100)
    setTimeout(updateTocPosition, 300)
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('DOMContentLoaded', updateTocPosition)
    }
  }, [tocRef])

  useEffect(() => {
    // 실제 DOM에서 헤딩 추출
    const postBody = document.querySelector('.post-body-desktop') || document.querySelector('.post-body')
    if (!postBody) return

    const headings = postBody.querySelectorAll('h1, h2, h3')
    
    const tocItems: TocItem[] = []
    const usedIds = new Set<string>()
    
    headings.forEach((heading) => {
      const text = heading.textContent || ''
      let baseId = textToId(text)
      
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
      // URL에서 디코딩된 ID 사용 (에러 처리 포함)
      let decodedId = hashId
      try {
        decodedId = decodeURIComponent(hashId)
      } catch (e) {
        // 디코딩 실패 시 원본 사용
        decodedId = hashId
      }
      
      const targetElement = document.getElementById(decodedId)
      if (targetElement) {
        // 요소의 절대 위치 계산
        const rect = targetElement.getBoundingClientRect()
        const absoluteTop = rect.top + window.scrollY
        const offsetPosition = absoluteTop - 100 // 상단에서 100px 여백
        
        window.scrollTo({
          top: Math.max(0, offsetPosition), // 음수 방지
          behavior: 'smooth'
        })
        setActiveId(decodedId)
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

    // 스크롤 시 현재 섹션 감지 및 TOC 위치 업데이트
    const handleScroll = () => {
      // TOC 위치 업데이트
      const postBody = document.querySelector('.post-body-desktop') || document.querySelector('.post-body')
      const tocElement = tocRef.current
      
      if (postBody && tocElement) {
        const postBodyRect = postBody.getBoundingClientRect()
        const scrollY = window.scrollY
        const postBodyTop = postBodyRect.top + scrollY
        
        // 본문 콘텐츠 영역의 우측 끝 위치 계산
        const contentElement = document.querySelector('.post-content-desktop') as HTMLElement
        const wrapperElement = document.querySelector('.post-content-wrapper') as HTMLElement
        if (!contentElement || !wrapperElement) return
        
        const contentRect = contentElement.getBoundingClientRect()
        const wrapperRect = wrapperElement.getBoundingClientRect()
        
        // 본문 시작 위치를 넘어가면 floating
        if (scrollY + 100 >= postBodyTop) {
          setIsFloating(true)
          // floating 상태일 때는 fixed positioning (본문 우측 끝에서 72px)
          const contentRightFixed = contentRect.right // 현재 화면 기준
          tocElement.style.position = 'fixed'
          tocElement.style.top = '100px'
          tocElement.style.left = `${contentRightFixed + 72}px`
          tocElement.style.right = ''
        } else {
          setIsFloating(false)
          // absolute일 때는 부모(wrapper) 기준으로 계산 (본문 우측 끝에서 72px)
          const postBodyTopPosition = postBodyRect.top + scrollY
          const contentRightAbsolute = contentRect.right + scrollY // 절대 위치
          const wrapperLeftAbsolute = wrapperRect.left + scrollY // 부모의 절대 위치
          const leftRelativeToWrapper = contentRightAbsolute - wrapperLeftAbsolute + 72 // 부모 기준 상대 위치
          tocElement.style.position = 'absolute'
          tocElement.style.top = `${postBodyTopPosition}px`
          tocElement.style.left = `${leftRelativeToWrapper}px`
          tocElement.style.right = ''
        }
      }

      // 현재 활성 섹션 감지 (tocItems를 다시 가져와서 최신 상태 유지)
      if (postBody) {
        const currentHeadings = postBody.querySelectorAll('h1, h2, h3')
        const currentTocItems: TocItem[] = []
        
        currentHeadings.forEach((heading) => {
          const id = heading.id
          if (id) {
            currentTocItems.push({
              id,
              text: heading.textContent || '',
              level: parseInt(heading.tagName.charAt(1)),
            })
          }
        })

        const scrollOffset = 150 // 화면 상단에서의 offset
        const scrollPosition = window.scrollY + scrollOffset
        
        // 모든 헤딩의 위치를 확인하여 현재 보이는 섹션 찾기
        let activeId = ''
        
        // 역순으로 확인하여 가장 가까운 헤딩 찾기
        for (let i = currentTocItems.length - 1; i >= 0; i--) {
          const element = document.getElementById(currentTocItems[i].id)
          if (element) {
            const rect = element.getBoundingClientRect()
            const elementTop = rect.top + window.scrollY
            
            // 현재 스크롤 위치가 이 헤딩을 지나갔는지 확인
            if (elementTop <= scrollPosition) {
              activeId = currentTocItems[i].id
              break
            }
          }
        }
        
        // 활성 ID 업데이트
        setActiveId((prevActiveId) => {
          if (prevActiveId !== activeId) {
            // URL 해시 업데이트 (스크롤로 인한 변경은 replaceState 사용, URL 인코딩 적용)
            if (activeId) {
              const encodedId = encodeURIComponent(activeId)
              if (window.location.hash !== `#${encodedId}`) {
                window.history.replaceState(null, '', `#${encodedId}`)
              }
            }
            return activeId
          }
          return prevActiveId
        })
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // 초기 실행

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [content])

  if (toc.length === 0) {
    return null
  }

  return (
    <aside 
      ref={tocRef}
      className={`table-of-contents ${isFloating ? 'toc-floating' : ''}`}
    >
      <nav className="toc-nav">
        <ul>
          {toc.map((item) => (
            <li
              key={item.id}
              className={`toc-item toc-level-${item.level} ${activeId === item.id ? 'active' : ''}`}
            >
                <a 
                  href={`#${encodeURIComponent(item.id)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    const element = document.getElementById(item.id)
                    if (element) {
                      // scrollIntoView를 사용하여 더 안정적으로 스크롤
                      const rect = element.getBoundingClientRect()
                      const absoluteTop = rect.top + window.scrollY
                      const offsetPosition = absoluteTop - 100 // 상단에서 100px 여백
                      
                      // 먼저 정확한 위치로 스크롤
                      window.scrollTo({
                        top: Math.max(0, offsetPosition),
                        behavior: 'smooth'
                      })
                      
                      // URL 해시 업데이트 (pushState로 히스토리 추가, URL 인코딩 적용)
                      const encodedId = encodeURIComponent(item.id)
                      window.history.pushState(null, '', `#${encodedId}`)
                      
                      // 활성 상태 즉시 업데이트
                      setActiveId(item.id)
                    }
                  }}
                >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

