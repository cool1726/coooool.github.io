'use client'

import { useEffect } from 'react'

export default function CodeCopyButton() {
  useEffect(() => {
    const handleCopy = async (button: HTMLButtonElement) => {
      // 같은 shiki-container 내의 pre code에서 코드 텍스트 추출
      const container = button.closest('.shiki-container')
      if (!container) return

      const codeElement = container.querySelector('pre code')
      if (!codeElement) return

      // 코드 텍스트 추출 (텍스트 노드만)
      let codeText = ''
      const walker = document.createTreeWalker(
        codeElement,
        NodeFilter.SHOW_TEXT,
        null
      )
      
      let node
      while (node = walker.nextNode()) {
        codeText += node.textContent
      }

      // 또는 간단하게 textContent 사용 (하지만 HTML 엔티티가 있을 수 있음)
      if (!codeText) {
        codeText = codeElement.textContent || ''
      }

      try {
        await navigator.clipboard.writeText(codeText)
        
        // 복사 성공 피드백
        const copyText = button.querySelector('.shiki-copy-text')
        if (copyText) {
          const originalText = copyText.textContent
          copyText.textContent = '복사됨!'
          button.classList.add('copied')
          
          setTimeout(() => {
            copyText.textContent = originalText
            button.classList.remove('copied')
          }, 2000)
        }
      } catch (err) {
        console.error('복사 실패:', err)
      }
    }

    const buttons = document.querySelectorAll('.shiki-copy-button')
    const clickHandlers = new Map<Element, () => void>()

    buttons.forEach((button) => {
      const handler = () => handleCopy(button as HTMLButtonElement)
      clickHandlers.set(button, handler)
      button.addEventListener('click', handler)
    })

    return () => {
      clickHandlers.forEach((handler, button) => {
        button.removeEventListener('click', handler)
      })
    }
  }, [])

  return null
}

