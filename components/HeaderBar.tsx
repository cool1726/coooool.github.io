'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Moon, Sun, Tag, FolderOpen } from 'lucide-react'
import SearchBar from './SearchBar'

export default function HeaderBar() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()
  
  // 포스팅 페이지인지 확인
  const isPostPage = pathname?.startsWith('/posts/')

  useEffect(() => {
    setMounted(true)
    // localStorage에서 다크모드 상태 확인
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setIsDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    // 포스팅 페이지가 아니면 항상 보이도록 설정
    if (!isPostPage) {
      setIsVisible(true)
      return
    }

    // 포스팅 페이지인 경우 스크롤 방향에 따라 표시/숨김 처리
    let lastScrollY = window.scrollY
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          
          // 스크롤 방향 확인
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // 아래로 스크롤 (100px 이상 스크롤된 경우에만 숨김)
            setIsVisible(false)
          } else if (currentScrollY < lastScrollY) {
            // 위로 스크롤
            setIsVisible(true)
          } else if (currentScrollY <= 100) {
            // 상단 근처에서는 항상 보이도록
            setIsVisible(true)
          }
          
          lastScrollY = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isPostPage])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleSearch = () => {
    setIsSearchOpen(true)
  }

  if (!mounted) {
    return null
  }

  return (
    <>
      <header className={`header-bar ${isVisible ? 'header-bar-visible' : 'header-bar-hidden'}`}>
        <div className="header-bar-content">
          <Link href="/" className="header-bar-item header-bar-logo">
            <span>@coooool.dev</span>
          </Link>
          <Link href="/categories" className="header-bar-item">
            <FolderOpen size={18} />
          </Link>
          <Link href="/tags" className="header-bar-item">
            <Tag size={18} />
          </Link>
          <button
            onClick={handleSearch}
            className="header-bar-item"
            aria-label="검색"
          >
            <Search size={18} />
          </button>
          <button
            onClick={toggleDarkMode}
            className="header-bar-item header-bar-dark-mode"
            aria-label="다크모드 토글"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

