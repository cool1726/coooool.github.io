'use client'

import { useEffect, useState } from 'react'
import Giscus from '@giscus/react'

export default function GiscusComments() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // 초기 테마 확인
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }
    
    checkTheme()

    // MutationObserver로 클래스 변경 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          checkTheme()
        }
      })
    })

    // document.documentElement 관찰 시작
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // localStorage 변경 감지 (다른 탭에서 테마 변경 시)
    const handleStorageChange = () => {
      checkTheme()
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      observer.disconnect()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="giscus-comments">
      <Giscus
        id="comments"
        repo="cool1726/coooool.github.io"
        repoId="R_kgDOQSsKxw"
        category="Comments"
        categoryId="DIC_kwDOQSsKx84CxvvK"
        mapping="pathname"
        term="Welcome to giscus!"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="bottom"
        theme={theme}
        lang="ko"
        loading="lazy"
      />
    </div>
  )
}

