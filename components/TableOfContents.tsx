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
      
      // 우측 위치 계산 (grid의 4번째 컬럼 위치에 맞춤)
      const wrapper = document.querySelector('.post-content-wrapper') as HTMLElement
      let rightOffset = 0
      if (wrapper) {
        const wrapperRect = wrapper.getBoundingClientRect()
        const wrapperRight = wrapperRect.right
        rightOffset = window.innerWidth - wrapperRight + 96 // grid의 4번째 컬럼 시작 위치
      }
      
      // 본문 시작 위치를 넘어가면 floating
      if (scrollY + 100 >= postBodyTop) {
        setIsFloating(true)
        // floating 상태일 때는 fixed positioning
        tocElement.style.position = 'fixed'
        tocElement.style.top = '100px'
        tocElement.style.right = `${rightOffset}px`
        tocElement.style.left = ''
      } else {
        setIsFloating(false)
        // 본문 시작 위치에 맞춰서 위치
        const postBodyTopPosition = postBodyRect.top + scrollY
        tocElement.style.position = 'absolute'
        tocElement.style.top = `${postBodyTopPosition}px`
        tocElement.style.right = `${rightOffset}px`
        tocElement.style.left = ''
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
        const elementPosition = targetElement.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - 100
        window.scrollTo({
          top: offsetPosition,
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
        
        // 우측 위치 계산 (grid의 4번째 컬럼 위치에 맞춤)
        const wrapper = document.querySelector('.post-content-wrapper') as HTMLElement
        let rightOffset = 0
        if (wrapper) {
          const wrapperRect = wrapper.getBoundingClientRect()
          const wrapperRight = wrapperRect.right
          rightOffset = window.innerWidth - wrapperRight + 96 // grid의 4번째 컬럼 시작 위치
        }
        
        // 본문 시작 위치를 넘어가면 floating
        if (scrollY + 100 >= postBodyTop) {
          setIsFloating(true)
          // floating 상태일 때는 fixed positioning
          tocElement.style.position = 'fixed'
          tocElement.style.top = '100px'
          tocElement.style.right = `${rightOffset}px`
          tocElement.style.left = ''
        } else {
          setIsFloating(false)
          // 본문 시작 위치에 맞춰서 위치
          const postBodyTopPosition = postBodyRect.top + scrollY
          tocElement.style.position = 'absolute'
          tocElement.style.top = `${postBodyTopPosition}px`
          tocElement.style.right = `${rightOffset}px`
          tocElement.style.left = ''
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
                      const elementPosition = element.getBoundingClientRect().top
                      const offsetPosition = elementPosition + window.scrollY - 100
                      
                      window.scrollTo({
                        top: offsetPosition,
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

