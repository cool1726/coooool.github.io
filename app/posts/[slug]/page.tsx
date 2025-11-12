import { marked } from 'marked'
import { getPostBySlug, getPosts, convertBlockToText } from '@/lib/notion'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TableOfContents from '@/components/TableOfContents'
import { Client } from '@notionhq/client'
import { createHighlighter } from 'shiki'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'

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

  // 이전 글과 다음 글 가져오기
  const allPosts = await getPosts()
  const currentIndex = allPosts.findIndex((p) => p.slug === slug)
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

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
    themes: ['one-dark-pro', 'github-light'],
    langs: ['javascript', 'typescript', 'jsx', 'tsx', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'html', 'css', 'scss', 'sass', 'less', 'json', 'yaml', 'yml', 'toml', 'xml', 'markdown', 'md', 'bash', 'shell', 'sh', 'sql', 'dockerfile', 'diff', 'text', 'plaintext'],
  })

  // marked 렌더러 커스터마이징 - 코드 블록에 syntax highlighting 적용
  const renderer = new marked.Renderer()
  renderer.code = (code: string, language: string | undefined) => {
    const lang = language || 'text'
    
    try {
      // shiki로 하이라이팅 (one-dark-pro 테마 사용 - VS Code 스타일)
      const html = highlighter.codeToHtml(code, {
        lang: lang,
        theme: 'one-dark-pro',
      })
      
      // 언어 라벨 추가 (선택사항)
      const langLabel = lang !== 'text' ? `<div class="shiki-lang-label">${lang}</div>` : ''
      
      // shiki가 생성한 HTML을 감싸서 더 예쁘게 스타일링
      return `<div class="shiki-container">${langLabel}${html}</div>`
    } catch (error) {
      // 언어를 인식하지 못하면 기본 코드 블록으로 렌더링
      return `<pre><code class="language-${lang}">${code}</code></pre>`
    }
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
        <Link href="/" className="back-link">
          <ArrowLeft size={18} className="back-link-icon" />
          목록으로 돌아가기
        </Link>
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
            <div
              className="post-body post-body-desktop"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </article>
        <nav className="post-navigation">
          {prevPost && (
            <Link href={`/posts/${encodeURIComponent(prevPost.slug)}`} className="post-nav-link post-nav-prev">
              <ChevronLeft className="post-nav-icon" size={20} />
              <div className="post-nav-content">
                <span className="post-nav-label">이전 글</span>
                <span className="post-nav-title">{prevPost.title}</span>
              </div>
            </Link>
          )}
          {nextPost && (
            <Link href={`/posts/${encodeURIComponent(nextPost.slug)}`} className="post-nav-link post-nav-next">
              <div className="post-nav-content">
                <span className="post-nav-label">다음 글</span>
                <span className="post-nav-title">{nextPost.title}</span>
              </div>
              <ChevronRight className="post-nav-icon" size={20} />
            </Link>
          )}
        </nav>
      </div>
      <TableOfContents content={htmlContent} />
    </main>
  )
}
