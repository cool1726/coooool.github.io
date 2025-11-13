import { marked } from 'marked'
import { getPostBySlug, getPosts, convertBlockToText } from '@/lib/notion'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import TableOfContents from '@/components/TableOfContents'
import BackLink from '@/components/BackLink'
import PostNavLinks from '@/components/PostNavLinks'
import GiscusComments from '@/components/GiscusComments'
import { Client } from '@notionhq/client'
import { createHighlighter } from 'shiki'
import MathContent from '@/components/MathContent'

// 소요시간 계산 함수 (분 단위)
function calculateReadingTime(text: string): number {
  // 한국어와 영어 단어 수 계산 (한국어는 공백 기준, 영어는 단어 기준)
  const koreanChars = (text.match(/[가-힣]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  // 한국어는 약 3자당 1단어로 계산, 영어는 1단어당 1단어
  const totalWords = Math.ceil(koreanChars / 3) + englishWords
  // 평균 읽기 속도: 분당 200단어
  const readingTime = Math.ceil(totalWords / 200)
  return Math.max(1, readingTime) // 최소 1분
}

// 날짜 포맷팅 함수 (February 18, 2025 형식)
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

export async function generateStaticParams() {
  const posts = await getPosts()
  // output: 'export' 모드에서는 URL 인코딩된 slug를 반환해야 함
  return posts.map((post) => ({
    slug: encodeURIComponent(post.slug),
  }))
}

export default async function PostPage({
  params,
}: {
  params: { slug: string }
}) {
  // Next.js가 자동으로 디코딩하지만, 안전하게 처리
  let slug = params.slug
  try {
    slug = decodeURIComponent(params.slug)
  } catch {
    // 이미 디코딩된 경우 원본 사용
    slug = params.slug
  }
  
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // 모든 글 가져오기 (카테고리 필터링은 클라이언트에서 처리)
  const allPosts = await getPosts()
  // 날짜 기준 내림차순 정렬 (최신순)
  allPosts.sort((a, b) => b.date.localeCompare(a.date))
  const currentIndex = allPosts.findIndex((p) => p.slug === slug)
  
  // 기본 이전/다음 글 (전체 글 기준)
  const defaultPrevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  const defaultNextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

  // 블록 구조가 있으면 실시간으로 파싱, 없으면 기존 content 사용 (하위 호환성)
  let processedContent = ''
  
  if (post.blocks && post.blocks.length > 0) {
    // 블록 구조를 실시간으로 파싱
    const notion = new Client({
      auth: process.env.NOTION_API_KEY || '',
    })
    
    for (const block of post.blocks) {
      processedContent += await convertBlockToText(block as any, notion)
    }
  } else if (post.content) {
    // 기존 content 사용 (하위 호환성)
    processedContent = post.content
  } else {
    notFound()
  }

  // shiki 하이라이터 초기화
  const highlighter = await createHighlighter({
    themes: ['one-dark-pro', 'catppuccin-latte'],
    langs: ['javascript', 'typescript', 'jsx', 'tsx', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss', 'sass', 'less', 'json', 'yaml', 'yml', 'toml', 'xml', 'markdown', 'md', 'bash', 'shell', 'sh', 'sql', 'dockerfile', 'diff', 'text', 'plaintext'],
  })

  // marked 렌더러 커스터마이징 - 코드 블록에 syntax highlighting 적용
  const renderer = new marked.Renderer()
  renderer.code = (code: string, language: string | undefined) => {
    const lang = language || 'text'
    
    try {
      // shiki로 하이라이팅 - 두 테마 모두 렌더링
      const darkHtml = highlighter.codeToHtml(code, {
        lang: lang,
        theme: 'one-dark-pro',
      })
      
      const lightHtml = highlighter.codeToHtml(code, {
        lang: lang,
        theme: 'catppuccin-latte',
      })
      
      // 언어 라벨 추가 (선택사항)
      const langLabel = lang !== 'text' ? `<div class="shiki-lang-label">${lang}</div>` : ''
      
      // 두 테마를 모두 포함하고 CSS로 전환
      return `<div class="shiki-container">
        ${langLabel}
        <div class="shiki-theme shiki-dark" data-theme="dark">${darkHtml}</div>
        <div class="shiki-theme shiki-light" data-theme="light">${lightHtml}</div>
      </div>`
    } catch (error) {
      // 언어를 인식하지 못하면 기본 코드 블록으로 렌더링
      return `<pre><code class="language-${lang}">${code}</code></pre>`
    }
  }

  // 이미지 렌더러 커스터마이징 - 외부 URL 이미지 직접 로드
  renderer.image = (href: string | null, title: string | null, text: string) => {
    if (!href) return ''
    
    // href가 URL인 경우 (http:// 또는 https://로 시작)
    const isExternalUrl = href.startsWith('http://') || href.startsWith('https://')
    
    // 외부 URL이거나 상대 경로인 경우 모두 직접 로드
    const imageSrc = isExternalUrl ? href : href
    
    const alt = text || ''
    const titleAttr = title ? ` title="${title.replace(/"/g, '&quot;')}"` : ''
    
    return `<img src="${imageSrc.replace(/"/g, '&quot;')}" alt="${alt.replace(/"/g, '&quot;')}"${titleAttr} loading="lazy" />`
  }

  // callout 내부 마크다운 처리
  const calloutRegex = /<div class="notion-callout">[\s\S]*?<div class="notion-callout-content">([\s\S]*?)<\/div>[\s\S]*?<\/div>/g
  
  const matches = Array.from(processedContent.matchAll(calloutRegex))
  for (const match of matches) {
    const fullMatch = match[0]
    const content = match[1]
    const htmlContent = await marked.parse(content.trim(), { 
      breaks: true, 
      gfm: true,
      renderer: renderer,
    })
    processedContent = processedContent.replace(fullMatch, fullMatch.replace(content, htmlContent))
  }

  const htmlContent = await marked(processedContent, {
    breaks: true,
    gfm: true,
    renderer: renderer,
  })

  // 소요시간은 Notion에서 가져온 값 사용, 없으면 계산
  const textContent = processedContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
  const readingTime = post.readingTime || calculateReadingTime(textContent)
  const formattedDate = formatDate(post.date)
  const author = post.author || 'coooool' // 기본값은 coooool

  return (
    <main className="post-content-wrapper">
      <div className="post-content post-content-desktop">
        <Suspense fallback={<div className="back-link">목록으로 돌아가기</div>}>
          <BackLink post={post} />
        </Suspense>
        <article className="post-article-desktop">
          <h1 className="post-title-desktop">{post.title}</h1>
          <div className="post-header-info">
            <div className="post-header-meta">
              <span className="post-author">@{author}</span>
              <span className="post-date">· {formattedDate}</span>
              <span className="post-reading-time">· {readingTime} min read</span>
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="post-tags">
                {post.tags.map((tag, index) => (
                  <Link key={index} href={`/tags/?q=${encodeURIComponent(tag)}`} className="post-tag">
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <hr className="post-divider" />
          <div className="notion-page-content-desktop">
            <MathContent html={htmlContent} />
          </div>
        </article>
        <Suspense fallback={null}>
          <PostNavLinks
            post={post}
            allPosts={allPosts}
            defaultPrevPost={defaultPrevPost}
            defaultNextPost={defaultNextPost}
          />
        </Suspense>
        <GiscusComments />
      </div>
      <TableOfContents content={htmlContent} />
    </main>
  )
}
