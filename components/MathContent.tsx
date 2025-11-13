'use client'

import { BlockMath, InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import { createRoot, Root } from 'react-dom/client'
import { useEffect, useRef } from 'react'

interface MathContentProps {
  html: string
}

/**
 * HTML 문자열에서 수식을 찾아서 react-katex 컴포넌트로 렌더링하는 컴포넌트
 */
export default function MathContent({ html }: MathContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rootsRef = useRef<Root[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // 이전에 생성한 React 루트 정리
    rootsRef.current.forEach((root) => root.unmount())
    rootsRef.current = []

    // HTML 엔티티 디코딩 함수
    const decodeHtmlEntities = (text: string): string => {
      const textarea = document.createElement('textarea')
      textarea.innerHTML = text
      return textarea.value
    }

    // HTML을 설정
    container.innerHTML = html

    // data-katex-expression 속성을 가진 요소들을 찾아서 렌더링
    const mathElements = container.querySelectorAll('[data-katex-expression]')
    mathElements.forEach((element) => {
      const expression = element.getAttribute('data-katex-expression')
      const type = element.getAttribute('data-katex-type') || 'block'
      
      if (!expression) return

      // HTML 엔티티 디코딩
      const decodedExpression = decodeHtmlEntities(expression)

      // React 컴포넌트 렌더링
      const root = createRoot(element as HTMLElement)
      if (type === 'block') {
        root.render(<BlockMath math={decodedExpression} />)
      } else {
        root.render(<InlineMath math={decodedExpression} />)
      }
      rootsRef.current.push(root)
    })

    // 일반 텍스트에서 $$...$$ 및 $...$ 패턴 찾기
    // 한 번의 순회로 모든 텍스트 노드를 수집
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    )

    const textNodes: Array<{ node: Node; text: string }> = []
    let node: Node | null
    while ((node = walker.nextNode())) {
      if (node.textContent && (node.textContent.includes('$'))) {
        // 코드 블록 내부인지 확인
        let parent = node.parentElement
        let isInCode = false
        while (parent) {
          if (parent.tagName === 'CODE' || parent.closest('code') || parent.closest('pre')) {
            isInCode = true
            break
          }
          parent = parent.parentElement
        }
        
        if (!isInCode) {
          textNodes.push({ node, text: node.textContent })
        }
      }
    }

    // 각 텍스트 노드에서 block math와 inline math를 모두 처리
    textNodes.forEach(({ node, text }) => {
      const parent = node.parentElement
      if (!parent) return

      // Block math와 inline math를 모두 찾기
      const blockMathRegex = /\$\$([\s\S]*?)\$\$/g
      const inlineMathRegex = /\$([^$\n]+?)\$/g
      
      // 모든 매치를 찾아서 정렬
      interface MathMatch {
        type: 'block' | 'inline'
        match: string
        expression: string
        index: number
      }
      
      const allMatches: MathMatch[] = []
      
      // Block math 찾기
      let match
      while ((match = blockMathRegex.exec(text)) !== null) {
        allMatches.push({
          type: 'block',
          match: match[0],
          expression: match[1],
          index: match.index,
        })
      }
      
      // Inline math 찾기 (block math와 겹치지 않는 것만)
      const blockMathIndices = new Set<number>()
      allMatches.forEach(m => {
        for (let i = m.index; i < m.index + m.match.length; i++) {
          blockMathIndices.add(i)
        }
      })
      
      while ((match = inlineMathRegex.exec(text)) !== null) {
        // Block math와 겹치는지 확인
        let overlaps = false
        for (let i = match.index; i < match.index + match[0].length; i++) {
          if (blockMathIndices.has(i)) {
            overlaps = true
            break
          }
        }
        
        if (!overlaps) {
          allMatches.push({
            type: 'inline',
            match: match[0],
            expression: match[1],
            index: match.index,
          })
        }
      }
      
      // 인덱스 순으로 정렬
      allMatches.sort((a, b) => b.index - a.index) // 역순 정렬

      if (allMatches.length > 0) {
        const fragment = document.createDocumentFragment()
        let lastIndex = text.length

        // 역순으로 처리하여 인덱스가 변경되지 않도록 함
        for (const mathMatch of allMatches) {
          const { type, match, expression, index } = mathMatch
          
          // 뒷부분 텍스트 추가
          if (lastIndex > index + match.length) {
            fragment.insertBefore(
              document.createTextNode(text.substring(index + match.length, lastIndex)),
              fragment.firstChild
            )
          }

          // 수식 컨테이너 생성
          const mathContainer = document.createElement(type === 'block' ? 'div' : 'span')
          mathContainer.className = type === 'block' ? 'katex-block' : 'katex-inline'
          
          const decodedExpression = decodeHtmlEntities(expression.trim())
          const root = createRoot(mathContainer)
          
          if (type === 'block') {
            root.render(<BlockMath math={decodedExpression} />)
          } else {
            root.render(<InlineMath math={decodedExpression} />)
          }
          rootsRef.current.push(root)
          
          fragment.insertBefore(mathContainer, fragment.firstChild)
          lastIndex = index
        }

        // 앞부분 텍스트 추가
        if (lastIndex > 0) {
          fragment.insertBefore(
            document.createTextNode(text.substring(0, lastIndex)),
            fragment.firstChild
          )
        }

        if (node.parentNode) {
          node.parentNode.replaceChild(fragment, node)
        }
      }
    })

    // cleanup 함수
    return () => {
      rootsRef.current.forEach((root) => root.unmount())
      rootsRef.current = []
    }
  }, [html])

  return <div ref={containerRef} className="post-body post-body-desktop" />
}

