'use client'

import { useState } from 'react'
import { useToc } from './useToc'

interface TableOfContentsMobileProps {
  content: string
}

export default function TableOfContentsMobile({ content }: TableOfContentsMobileProps) {
  const { toc, activeId, handleTocClick } = useToc(content)
  const [isOpen, setIsOpen] = useState<boolean>(false)

  if (toc.length === 0) {
    return null
  }

  return (
    <aside className="table-of-contents-mobile">
      <div className="toc-header">
        <button 
          className="toc-toggle-button" 
          aria-label="목차"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className="toc-toggle-icon">{isOpen ? '▼' : '▶'}</span>
          <span>목차</span>
        </button>
      </div>
      {isOpen && (
        <nav className="toc-nav">
          <ul>
            {toc.map((item) => (
              <li
                key={item.id}
                className={`toc-item toc-level-${item.level} ${activeId === item.id ? 'active' : ''}`}
              >
                <a 
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleTocClick(item)
                    setIsOpen(false)
                  }}
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  )
}

