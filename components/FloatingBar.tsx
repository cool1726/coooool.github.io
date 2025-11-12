'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Moon, Sun, Tag, FolderOpen } from 'lucide-react'

export default function FloatingBar() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // localStorage에서 다크모드 상태 확인
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setIsDarkMode(savedDarkMode)
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

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
    // 검색 팝업은 나중에 구현
    console.log('Search clicked')
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="floating-bar">
      <div className="floating-bar-content">
        <Link href="/" className="floating-bar-item floating-bar-logo">
          <span>@coooool.dev</span>
        </Link>
        <Link href="/categories" className="floating-bar-item">
          <FolderOpen size={18} />
        </Link>
        <Link href="/tags" className="floating-bar-item">
          <Tag size={18} />
        </Link>
        <button
          onClick={handleSearch}
          className="floating-bar-item"
          aria-label="검색"
        >
          <Search size={18} />
        </button>
        <button
          onClick={toggleDarkMode}
          className="floating-bar-item floating-bar-dark-mode"
          aria-label="다크모드 토글"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  )
}

