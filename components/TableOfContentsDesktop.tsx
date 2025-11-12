'use client'

import { useToc } from './useToc'

interface TableOfContentsDesktopProps {
  content: string
}

export default function TableOfContentsDesktop({ content }: TableOfContentsDesktopProps) {
  const { toc, activeId, handleTocClick } = useToc(content)

  if (toc.length === 0) {
    return null
  }

  return (
    <aside className="table-of-contents-desktop">
      <div className="toc-header">목차</div>
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

