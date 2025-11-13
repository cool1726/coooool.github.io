import { Client } from '@notionhq/client'
import dayjs from 'dayjs'
import fs from 'fs'
import path from 'path'
import urlMetadata from 'url-metadata'

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

export interface Post {
  id: string
  title: string
  slug: string
  date: string
  excerpt?: string
  content?: string // 선택적 (하위 호환성)
  blocks?: any[] // 원본 블록 구조
  author?: string // 저자
  tags?: string[] // 태그
  category?: string // 카테고리
  readingTime?: number // 소요시간 (분)
  thumbnail?: string // 썸네일 이미지 URL
}

// Notion 데이터베이스 ID를 환경변수에서 가져옴
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || ''

// 블록에서 첫 번째 이미지 URL 추출
function extractFirstImage(blocks: any[]): string | undefined {
  for (const block of blocks) {
    if (block.type === 'image') {
      const imageUrl = block.image?.file?.url || block.image?.external?.url || ''
      if (imageUrl) {
        return imageUrl
      }
    }
    // 자식 블록이 있으면 재귀적으로 검색
    if (block.children && Array.isArray(block.children)) {
      const childImage = extractFirstImage(block.children)
      if (childImage) {
        return childImage
      }
    }
  }
  return undefined
}

async function fetchAllBlocks(blockId: string, includeChildren: boolean = true): Promise<any[]> {
  let allBlocks: any[] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    })
    
    const blocks = response.results
    
    // 자식 블록도 재귀적으로 가져오기
    if (includeChildren) {
      for (const block of blocks) {
        const blockAny = block as any
        if (blockAny.has_children) {
          blockAny.children = await fetchAllBlocks(blockAny.id, includeChildren)
        }
      }
    }
    
    allBlocks = allBlocks.concat(blocks)
    cursor = response.next_cursor || undefined
  } while (cursor)

  return allBlocks
}

export async function fetchNotionPosts(): Promise<Post[]> {
  if (!NOTION_DATABASE_ID) {
    console.warn('NOTION_DATABASE_ID가 설정되지 않았습니다.')
    return []
  }

  try {
    // 오늘 날짜 (YYYY-MM-DD 형식)
    const today = dayjs().format('YYYY-MM-DD')

    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        and: [
          {
            property: 'Status',
            status: {
              equals: 'Published',
            },
          },
          {
            property: 'Last Updated',
            date: {
              on_or_after: today,
            },
          },
        ],
      },
      sorts: [
        {
          property: 'Last Updated',
          direction: 'descending',
        },
      ],
    })

    const posts: Post[] = []

    for (const page of response.results) {
      const pageId = page.id
      
      // 페이지 내용 가져오기 (모든 블록)
      const blocks = await fetchAllBlocks(pageId)

      // 블록 구조를 JSON으로 저장 (디버깅용)
      const testDir = path.join(process.cwd(), 'data', 'test')
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
      }
      const testFilePath = path.join(testDir, `${pageId}.json`)
      fs.writeFileSync(testFilePath, JSON.stringify(blocks, null, 2), 'utf8')

      const titleProperty = (page as any).properties.Title
      const publishedDateProperty = (page as any).properties['Published Date']
      const lastUpdatedProperty = (page as any).properties['Last Updated']
      const tagsProperty = (page as any).properties.Tags
      const categoryProperty = (page as any).properties.Category
      const authorProperty = (page as any).properties.Author
      const readingTimeProperty = (page as any).properties['Estimated Reading Time']

      const title = titleProperty?.title?.[0]?.plain_text || '제목 없음'
      // Published Date가 있으면 사용하고, 없으면 Last Updated 사용
      const date = publishedDateProperty?.date?.start || 
                   lastUpdatedProperty?.date?.start || 
                   dayjs().format('YYYY-MM-DD')

      // Tags 필드에서 태그 추출
      const tags: string[] = []
      if (tagsProperty?.multi_select) {
        tags.push(...tagsProperty.multi_select.map((tag: any) => tag.name))
      }

      // Category 필드에서 카테고리 추출
      let category: string | undefined
      if (categoryProperty) {
        if (categoryProperty.type === 'select' && categoryProperty.select) {
          category = categoryProperty.select.name
        }
      }

      // Author 필드에서 저자 추출
      let author: string | undefined
      if (authorProperty?.rich_text?.[0]?.plain_text) {
        author = authorProperty.rich_text[0].plain_text
      } else if (authorProperty?.title?.[0]?.plain_text) {
        author = authorProperty.title[0].plain_text
      } else if (authorProperty?.select?.name) {
        author = authorProperty.select.name
      }

      // Estimated Reading Time 필드에서 소요시간 추출 (분 단위)
      let readingTime: number | undefined
      if (readingTimeProperty?.number !== undefined && readingTimeProperty.number !== null) {
        readingTime = readingTimeProperty.number
      }

      // 블록에서 첫 번째 이미지 추출 (썸네일)
      const thumbnail = extractFirstImage(blocks)

      // slug 생성 (제목을 기반으로)
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // 블록 구조를 그대로 저장 (실시간 파싱용)
      posts.push({
        id: pageId,
        title,
        slug,
        date,
        author,
        tags: tags.length > 0 ? tags : undefined,
        category,
        readingTime,
        thumbnail,
        blocks,
      })
    }

    return posts
  } catch (error) {
    console.error('Notion API 오류:', error)
    return []
  }
}

// Notion 색상 값을 CSS 변수로 매핑하는 함수
function getColorCSSVariable(color: string): string | null {
  if (!color || color === 'default') return null
  
  // 배경색 처리
  if (color.endsWith('_background')) {
    const baseColor = color.replace('_background', '')
    const colorMap: Record<string, string> = {
      'gray': 'gra',
      'grey': 'gra',
      'brown': 'bro',
      'orange': 'ora',
      'yellow': 'yel',
      'green': 'gre',
      'blue': 'blu',
      'purple': 'pur',
      'pink': 'pin',
      'red': 'red',
    }
    const cssColor = colorMap[baseColor] || baseColor
    return `var(--ca-${cssColor}BacSecTra)`
  }
  
  // 텍스트 색상 처리
  const colorMap: Record<string, string> = {
    'gray': 'gra',
    'grey': 'gra',
    'brown': 'bro',
    'orange': 'ora',
    'yellow': 'yel',
    'green': 'gre',
    'blue': 'blu',
    'purple': 'pur',
    'pink': 'pin',
    'red': 'red',
  }
  const cssColor = colorMap[color] || color
  return `var(--c-${cssColor}TexSec)`
}

// 텍스트에서 inline math를 찾아서 처리하는 헬퍼 함수
function processInlineMath(text: string): string {
  // Block math ($$...$$)는 여기서 처리하지 않음 (이미 처리됨)
  // Inline math ($...$)만 처리
  const inlineMathRegex = /\$([^$\n]+?)\$/g
  let processedText = text
  const matches: Array<{ match: string; expression: string; index: number }> = []
  
  let match
  while ((match = inlineMathRegex.exec(text)) !== null) {
    matches.push({
      match: match[0],
      expression: match[1],
      index: match.index,
    })
  }
  
  // 역순으로 처리하여 인덱스가 변경되지 않도록 함
  for (let i = matches.length - 1; i >= 0; i--) {
    const { match, expression, index } = matches[i]
    const escapedExpression = expression.replace(/"/g, '&quot;')
    const mathMarker = `<span class="katex-inline" data-katex-expression="${escapedExpression}" data-katex-type="inline"></span>`
    processedText = processedText.substring(0, index) + mathMarker + processedText.substring(index + match.length)
  }
  
  return processedText
}

// rich_text를 HTML로 변환하는 함수 (inline code 포함)
function convertRichTextToHTML(richText: any[]): string {
  if (!richText || richText.length === 0) return ''
  
  return richText.map((item: any) => {
    let text = item.plain_text || ''
    const annotations = item.annotations || {}
    
    // equation 타입 처리 (rich_text 배열 내부의 inline equation)
    if (item.type === 'equation') {
      const equationExpression = item.equation?.expression || text
      const escapedExpression = equationExpression.replace(/"/g, '&quot;')
      
      // 스타일 속성 수집
      const styles: string[] = []
      
      if (annotations.bold) {
        styles.push('font-weight: bold')
      }
      if (annotations.italic) {
        styles.push('font-style: italic')
      }
      
      const textDecorations: string[] = []
      if (annotations.strikethrough) {
        textDecorations.push('line-through')
      }
      if (annotations.underline) {
        textDecorations.push('underline')
      }
      if (textDecorations.length > 0) {
        styles.push(`text-decoration: ${textDecorations.join(' ')}`)
      }
      
      const color = annotations.color
      if (color && color !== 'default') {
        const colorVar = getColorCSSVariable(color)
        if (colorVar) {
          if (color.endsWith('_background')) {
            styles.push(`background-color: ${colorVar}`)
          } else {
            styles.push(`color: ${colorVar}`)
          }
        }
      }
      
      const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
      return `<span class="katex-inline" data-katex-expression="${escapedExpression}" data-katex-type="inline"${styleAttr}></span>`
    }
    
    // inline code 처리 (code가 true이면 다른 스타일 무시, inline math도 처리하지 않음)
    if (annotations.code) {
      return `<span class="notion-inline-code-container" style="display:inline"><span style="font-family:&quot;SFMono-Regular&quot;, Menlo, Consolas, &quot;PT Mono&quot;, &quot;Liberation Mono&quot;, Courier, monospace;line-height:normal;background:rgba(135,131,120,.15);color:#EB5757;border-radius:4px;font-size:85%;padding:0.2em 0.4em;position:relative;bottom:0.065em" data-token-index="0" spellcheck="false" class="notion-enable-hover">${text}</span></span>`
    }
    
    // inline math 처리 (코드 블록이 아닌 경우에만)
    text = processInlineMath(text)
    
    // link URL 확인
    // 1. text 타입의 경우: text.link.url 또는 href
    // 2. mention 타입의 경우: mention.link_mention.href 또는 href
    let linkUrl: string | null = null
    
    if (item.type === 'mention' && item.mention?.type === 'link_mention') {
      linkUrl = item.mention?.link_mention?.href || item.href || null
    } else if (item.type === 'text') {
      linkUrl = item.text?.link?.url || item.href || null
    } else {
      // 기타 타입에서도 href가 있으면 사용
      linkUrl = item.href || null
    }
    
    // 스타일 속성 수집
    const styles: string[] = []
    
    // bold 처리
    if (annotations.bold) {
      styles.push('font-weight: bold')
    }
    
    // italic 처리
    if (annotations.italic) {
      styles.push('font-style: italic')
    }
    
    // text-decoration 처리 (strikethrough와 underline 동시 지원)
    const textDecorations: string[] = []
    if (annotations.strikethrough) {
      textDecorations.push('line-through')
    }
    if (annotations.underline) {
      textDecorations.push('underline')
    }
    if (textDecorations.length > 0) {
      styles.push(`text-decoration: ${textDecorations.join(' ')}`)
    }
    
    // 색상 처리
    const color = annotations.color
    if (color && color !== 'default') {
      const colorVar = getColorCSSVariable(color)
      if (colorVar) {
        if (color.endsWith('_background')) {
          styles.push(`background-color: ${colorVar}`)
        } else {
          styles.push(`color: ${colorVar}`)
        }
      }
    }
    
    // link가 있는 경우 처리
    if (linkUrl) {
      // link 스타일 추가 (파란색 제거, 지정된 스타일만 적용)
      const linkStyles: string[] = [
        'text-decoration: underline',
        'text-decoration-thickness: 0.05em',
        'text-decoration-color: var(--ca-opaLinDecCol)',
        'text-underline-offset: 10%',
        'opacity: 0.7',
        'color: inherit', // 파란색 제거, 부모 색상 상속
        'white-space: normal', // 줄바꿈 허용
        'word-break: break-word', // 긴 단어도 줄바꿈
        'overflow-wrap: break-word' // 긴 URL도 줄바꿈
      ]
      
      // 기존 스타일과 합치기 (link 스타일이 우선)
      const allStyles = [...linkStyles, ...styles]
      const styleAttr = allStyles.join('; ')
      
      return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="${styleAttr}">${text}</a>`
    }
    
    // 스타일이 있으면 span으로 감싸기
    if (styles.length > 0) {
      const styleAttr = styles.join('; ')
      return `<span style="${styleAttr}">${text}</span>`
    }
    
    return text
  }).join('')
}

export async function convertBlockToText(block: any, notionClient?: Client): Promise<string> {
  const type = block.type
  let text = ''

  switch (type) {
    case 'text':
      // text 타입 블록 처리 (최우선)
      text = convertRichTextToHTML(block.text?.rich_text || [])
      return `<p>${text}</p>

`
    
    case 'paragraph':
      const paragraphRichText = block.paragraph?.rich_text || []
      
      // mention (link_mention)만 있는 경우 간단한 한 줄 블록으로 렌더링
      if (paragraphRichText.length === 1 && paragraphRichText[0]?.type === 'mention' && paragraphRichText[0]?.mention?.type === 'link_mention') {
        const mention = paragraphRichText[0].mention.link_mention
        const mentionUrl = mention.href || paragraphRichText[0].href || ''
        const mentionTitle = mention.title || mentionUrl
        const mentionAuthor = mention.link_author || ''
        const mentionThumbnail = mention.icon_url || mention.thumbnail_url || ''
        
        if (mentionUrl) {
          return `<div class="notion-mention-block">
<a href="${mentionUrl}" target="_blank" rel="noopener noreferrer" class="notion-mention-link">
${mentionThumbnail ? `<img class="notion-mention-thumbnail" src="${mentionThumbnail}" alt="${mentionTitle}" />` : ''}
<span class="notion-mention-content">
${mentionAuthor ? `<span class="notion-mention-author">${mentionAuthor}</span>` : ''}
<span class="notion-mention-title">${mentionTitle}</span>
</span>
</a>
</div>

`
        }
      }
      
      text = convertRichTextToHTML(paragraphRichText)
      return text ? `<p>${text}</p>

` : ''
    
    case 'heading_1':
      text = convertRichTextToHTML(block.heading_1?.rich_text || [])
      return text ? `<h1>${text}</h1>

` : ''
    
    case 'heading_2':
      text = convertRichTextToHTML(block.heading_2?.rich_text || [])
      return text ? `<h2>${text}</h2>

` : ''
    
    case 'heading_3':
      text = convertRichTextToHTML(block.heading_3?.rich_text || [])
      return text ? `<h3>${text}</h3>

` : ''
    
    case 'bulleted_list_item':
      text = convertRichTextToHTML(block.bulleted_list_item?.rich_text || [])
      
      // 자식 블록 처리 (중첩된 리스트)
      let bulletedChildren = ''
      if (block.has_children) {
        const childBlocks = (block as any).children || (notionClient ? await fetchAllBlocks(block.id) : [])
        const childContent = await Promise.all(
          childBlocks.map((childBlock: any) => convertBlockToText(childBlock, notionClient))
        )
        bulletedChildren = childContent.join('').trim()
      }
      
      return text ? `<div class="notion-bulleted-list-block">
<div class="notion-list-item-inner">
<div class="notion-list-item-box-left">
<div class="notion-list-item-marker"></div>
</div>
<div class="notion-list-item-content-wrapper">
<div class="notion-list-item-content">${text}</div>
${bulletedChildren ? `<div class="notion-list-item-children">${bulletedChildren}</div>` : ''}
</div>
</div>
</div>
` : ''
    
    case 'numbered_list_item':
      text = convertRichTextToHTML(block.numbered_list_item?.rich_text || [])
      
      // 자식 블록 처리 (중첩된 리스트)
      let numberedChildren = ''
      if (block.has_children) {
        const childBlocks = (block as any).children || (notionClient ? await fetchAllBlocks(block.id) : [])
        const childContent = await Promise.all(
          childBlocks.map((childBlock: any) => convertBlockToText(childBlock, notionClient))
        )
        numberedChildren = childContent.join('').trim()
      }
      
      return text ? `<div class="notion-numbered-list-block">
<div class="notion-list-item-inner">
<div class="notion-list-item-box-left notion-numbered-box">
<span class="notion-list-item-number"></span>
</div>
<div class="notion-list-item-content-wrapper">
<div class="notion-list-item-content">${text}</div>
${numberedChildren ? `<div class="notion-list-item-children">${numberedChildren}</div>` : ''}
</div>
</div>
</div>
` : ''
    
    case 'code':
      text = block.code?.rich_text?.map((t: any) => t.plain_text).join('') || ''
      const language = block.code?.language || ''
      return text ? `\`\`\`${language}\n${text}\n\`\`\`\n\n` : ''
    
    case 'quote':
      text = convertRichTextToHTML(block.quote?.rich_text || [])
      
      // quote 자식 블록 처리
      let quoteContent = text
      if (block.has_children) {
        // 저장된 children 속성이 있으면 사용, 없으면 API 호출
        const childBlocks = (block as any).children || (notionClient ? await fetchAllBlocks(block.id) : [])
        const childContent = await Promise.all(
          childBlocks.map((childBlock: any) => convertBlockToText(childBlock, notionClient))
        )
        const childText = childContent.join('').trim()
        if (childText) {
          quoteContent = text ? `${text}${childText}` : childText
        }
      }
      
      return quoteContent ? `<blockquote><div>${quoteContent}</div></blockquote>

` : ''
    
    case 'callout':
      const calloutText = convertRichTextToHTML(block.callout?.rich_text || [])
      const calloutIcon = block.callout?.icon
      const calloutColor = block.callout?.color || 'default'
      
      // callout 자식 블록 처리
      let calloutContent = calloutText
      if (block.has_children) {
        // 저장된 children 속성이 있으면 사용, 없으면 API 호출
        const childBlocks = (block as any).children || (notionClient ? await fetchAllBlocks(block.id) : [])
        const childContent = await Promise.all(
          childBlocks.map((childBlock: any) => convertBlockToText(childBlock, notionClient))
        )
        const childText = childContent.join('').trim()
        if (childText) {
          calloutContent = calloutText ? `${calloutText}\n\n${childText}` : childText
        }
      } else {
        // 자식이 없는 경우, 줄바꿈을 <br>로 변환하여 여러 줄 처리
        calloutContent = calloutText.replace(/\n/g, '<br>')
      }
      
      // 아이콘 처리
      let iconHTML = ''
      if (calloutIcon) {
        const iconEmoji = calloutIcon.emoji || '💡'
        // color에서 _background 제거하여 아이콘 색상 결정
        const iconColor = calloutColor.endsWith('_background') 
          ? calloutColor.replace('_background', '') 
          : calloutColor
        iconHTML = `<div class="notion-callout-icon notion-callout-icon-${iconColor}">${iconEmoji}</div>`
      }
      
      // HTML 구조로 변환 (마크다운은 marked가 처리)
      return `<div class="notion-callout notion-callout-${calloutColor}">
${iconHTML}
<div class="notion-callout-content notion-callout-content-${calloutColor}">
${calloutContent}
</div>
</div>

`
    
    case 'to_do':
      const todoText = convertRichTextToHTML(block.to_do?.rich_text || [])
      const checked = block.to_do?.checked || false
      return todoText ? `<div class="notion-to-do-block">
<div class="notion-to-do-inner">
<div class="notion-to-do-checkbox-wrapper">
<div class="notion-to-do-checkbox-inner" ${checked ? 'data-checked="true"' : ''}>
${checked ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.62 3.18a.876.876 0 0 1 1.5.9l-5.244 8.74a.876.876 0 0 1-1.414.12L2.966 8.86a.875.875 0 1 1 1.328-1.138L7 10.879z" fill="currentColor"></path></svg>' : '<div aria-hidden="true"></div>'}
<input type="checkbox" class="notion-to-do-checkbox" ${checked ? 'checked' : ''} disabled aria-hidden="true" />
</div>
</div>
<div class="notion-to-do-content-wrapper">
<div class="notion-to-do-content ${checked ? 'notion-to-do-checked' : ''}">${todoText}</div>
</div>
</div>
</div>

` : ''
    
    case 'toggle':
      const toggleText = convertRichTextToHTML(block.toggle?.rich_text || [])
      
      // toggle 자식 블록 처리
      let toggleContent = ''
      if (block.has_children) {
        // 저장된 children 속성이 있으면 사용, 없으면 API 호출
        const childBlocks = (block as any).children || (notionClient ? await fetchAllBlocks(block.id) : [])
        const childContent = await Promise.all(
          childBlocks.map((childBlock: any) => convertBlockToText(childBlock, notionClient))
        )
        toggleContent = childContent.join('').trim()
      }
      
      if (!toggleText && !toggleContent) return ''
      
      return `<div class="notion-toggle-block">
<details>
<summary class="notion-toggle-header">
<div class="notion-list-item-inner">
<div class="notion-list-item-box-left">
<div class="notion-toggle-icon"></div>
</div>
<div class="notion-list-item-content-wrapper">
<div class="notion-list-item-content">${toggleText || 'Toggle'}</div>
</div>
</div>
</summary>
<div class="notion-toggle-content">
${toggleContent}
</div>
</details>
</div>

`
    
    case 'divider':
      return '<div role="separator" style="width: 100%; height: 1px; visibility: visible; border-bottom: 1px solid var(--c-borPri);"></div>\n\n'
    
    case 'bookmark':
      const bookmarkUrl = block.bookmark?.url || ''
      const bookmarkCaption = block.bookmark?.caption?.map((t: any) => t.plain_text).join('') || ''
      
      if (!bookmarkUrl) return ''
      
      // URL에서 해시(#) 부분 제거 (메타데이터는 페이지 레벨에서 가져오므로)
      const cleanUrl = bookmarkUrl.split('#')[0]
      
      // url-metadata를 사용하여 메타데이터 가져오기
      try {
        const metadata = await urlMetadata(cleanUrl, {
          requestFilteringAgentOptions: {
            allowPrivateIPAddress: true,
          }
        })
        
        // 메타데이터에서 정보 추출 (우선순위: og: > 일반 메타 > URL)
        const bookmarkTitle = metadata['og:title'] || metadata.title || bookmarkUrl
        const bookmarkDescription = metadata['og:description'] || metadata.description || ''
        const bookmarkImage = metadata['og:image'] || metadata.image || metadata['og:image:secure_url'] || ''
        
        // favicon 추출 (favicons 배열에서 href 가져오기)
        let faviconUrl = ''
        if (metadata.favicons && Array.isArray(metadata.favicons) && metadata.favicons.length > 0) {
          faviconUrl = metadata.favicons[0].href || ''
        }
        
        // favicon이 상대 경로인 경우 절대 경로로 변환
        if (faviconUrl && !faviconUrl.startsWith('http')) {
          try {
            const urlObj = new URL(cleanUrl)
            if (faviconUrl.startsWith('//')) {
              faviconUrl = urlObj.protocol + faviconUrl
            } else if (faviconUrl.startsWith('/')) {
              faviconUrl = urlObj.origin + faviconUrl
            } else {
              faviconUrl = urlObj.origin + '/' + faviconUrl
            }
          } catch (e) {
            // URL 파싱 실패 시 기본 favicon 경로 시도
            try {
              const urlObj = new URL(cleanUrl)
              faviconUrl = urlObj.origin + '/favicon.ico'
            } catch (e2) {
              faviconUrl = ''
            }
          }
        }
        
        // favicon이 없으면 기본 favicon.ico 경로 사용
        if (!faviconUrl) {
          try {
            const urlObj = new URL(cleanUrl)
            faviconUrl = urlObj.origin + '/favicon.ico'
          } catch (e) {
            faviconUrl = ''
          }
        }
        
        return `<div class="notion-bookmark-block">
<a href="${bookmarkUrl}" target="_blank" rel="noopener noreferrer" class="notion-bookmark-link">
<div class="notion-bookmark-text">
<div class="notion-bookmark-title">${bookmarkTitle}</div>
${bookmarkDescription ? `<div class="notion-bookmark-description">${bookmarkDescription}</div>` : ''}
<div class="notion-bookmark-url">
${faviconUrl ? `<img class="notion-bookmark-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" ${faviconUrl ? 'style="display:none"' : ''}>
<path d="M2.75 2h6.586a1 1 0 0 1 .707.293l3.414 3.414a1 1 0 0 1 .293.707V14.25a.75.75 0 0 1-.75.75h-10.5a.75.75 0 0 1-.75-.75V2.75A.75.75 0 0 1 2.75 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<span>${bookmarkUrl}</span>
</div>
</div>
${bookmarkImage ? `<div class="notion-bookmark-image"><div class="notion-bookmark-image-wrapper"><img src="${bookmarkImage}" alt="${bookmarkTitle}" /></div></div>` : ''}
</a>
</div>

`
      } catch (error: any) {
        // 메타데이터 가져오기 실패 시 기본값 사용 (에러 로그는 개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to fetch metadata for ${bookmarkUrl}:`, error.message || error)
        }
        // 에러 시에도 favicon 시도
        let faviconUrl = ''
        try {
          const urlObj = new URL(cleanUrl)
          faviconUrl = urlObj.origin + '/favicon.ico'
        } catch (e) {
          faviconUrl = ''
        }
        
        return `<div class="notion-bookmark-block">
<a href="${bookmarkUrl}" target="_blank" rel="noopener noreferrer" class="notion-bookmark-link">
<div class="notion-bookmark-text">
<div class="notion-bookmark-title">${bookmarkUrl}</div>
<div class="notion-bookmark-url">
${faviconUrl ? `<img class="notion-bookmark-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" ${faviconUrl ? 'style="display:none"' : ''}>
<path d="M2.75 2h6.586a1 1 0 0 1 .707.293l3.414 3.414a1 1 0 0 1 .293.707V14.25a.75.75 0 0 1-.75.75h-10.5a.75.75 0 0 1-.75-.75V2.75A.75.75 0 0 1 2.75 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<span>${bookmarkUrl}</span>
</div>
</div>
</a>
</div>

`
      }
    
    case 'link_preview':
      const linkPreviewUrl = block.link_preview?.url || ''
      return linkPreviewUrl ? `[${linkPreviewUrl}](${linkPreviewUrl})\n\n` : ''
    
    case 'image':
      const imageUrl = block.image?.file?.url || block.image?.external?.url || ''
      const imageCaption = block.image?.caption?.map((t: any) => t.plain_text).join('') || ''
      return imageUrl ? `![${imageCaption || 'Image'}](${imageUrl})\n\n` : ''
    
    case 'video':
      const videoUrl = block.video?.file?.url || block.video?.external?.url || ''
      const videoCaption = block.video?.caption?.map((t: any) => t.plain_text).join('') || ''
      return videoUrl ? `[Video: ${videoCaption || videoUrl}](${videoUrl})\n\n` : ''
    
    case 'file':
      const fileUrl = block.file?.file?.url || block.file?.external?.url || ''
      const fileName = block.file?.caption?.map((t: any) => t.plain_text).join('') || 'File'
      return fileUrl ? `[${fileName}](${fileUrl})\n\n` : ''
    
    case 'pdf':
      const pdfUrl = block.pdf?.file?.url || block.pdf?.external?.url || ''
      const pdfCaption = block.pdf?.caption?.map((t: any) => t.plain_text).join('') || 'PDF'
      return pdfUrl ? `[${pdfCaption}](${pdfUrl})\n\n` : ''
    
    case 'embed':
      const embedUrl = block.embed?.url || ''
      const embedCaption = block.embed?.caption?.map((t: any) => t.plain_text).join('') || ''
      return embedUrl ? `<iframe src="${embedUrl}"></iframe>\n\n${embedCaption ? `*${embedCaption}*\n\n` : ''}` : ''
    
    case 'equation':
      const equationExpression = block.equation?.expression || ''
      // react-katex를 위한 특별한 마커 사용 (data 속성으로 식별 가능하도록)
      return equationExpression ? `<div class="katex-block" data-katex-expression="${equationExpression.replace(/"/g, '&quot;')}" data-katex-type="block"></div>\n\n` : ''
    
    case 'table':
      const tableWidth = block.table?.table_width || 0
      const hasColumnHeader = block.table?.has_column_header || false
      const hasRowHeader = block.table?.has_row_header || false
      
      // 테이블 자식 블록들 가져오기
      let tableRows: any[] = []
      if (block.has_children) {
        const childBlocks = (block as any).children || (notionClient ? await fetchAllBlocks(block.id) : [])
        tableRows = childBlocks.filter((child: any) => child.type === 'table_row')
      }
      
      if (tableRows.length === 0) {
        return '<div class="notion-table-block">\n[Table]\n</div>\n\n'
      }
      
      // 테이블 HTML 생성
      let tableHTML = '<div class="notion-table-block"><table class="notion-table">\n'
      
      // 헤더가 있으면 thead 생성
      if (hasColumnHeader && tableRows.length > 0) {
        const headerRow = tableRows[0]
        const headerCells = headerRow.table_row?.cells || []
        tableHTML += '<thead>\n<tr>\n'
        headerCells.forEach((cell: any[], index: number) => {
          const cellContent = convertRichTextToHTML(cell || [])
          tableHTML += `<th>${cellContent}</th>\n`
        })
        tableHTML += '</tr>\n</thead>\n'
        tableRows = tableRows.slice(1) // 헤더 행 제거
      }
      
      // tbody 생성
      tableHTML += '<tbody>\n'
      tableRows.forEach((row: any) => {
        const cells = row.table_row?.cells || []
        tableHTML += '<tr>\n'
        cells.forEach((cell: any[], index: number) => {
          const cellContent = convertRichTextToHTML(cell || [])
          const isRowHeader = hasRowHeader && index === 0
          const tag = isRowHeader ? 'th' : 'td'
          tableHTML += `<${tag}>${cellContent}</${tag}>\n`
        })
        tableHTML += '</tr>\n'
      })
      tableHTML += '</tbody>\n'
      
      tableHTML += '</table></div>\n\n'
      return tableHTML
    
    case 'table_row':
      // table_row는 table 블록의 자식으로만 처리되므로 여기서는 무시
      return ''
    
    case 'table_of_contents':
      return '\n[Table of Contents]\n\n'
    
    case 'breadcrumb':
      return '\n[Breadcrumb]\n\n'
    
    case 'column_list':
      // 컬럼 리스트의 자식 컬럼들 가져오기
      let columns: any[] = []
      if (block.has_children) {
        const childBlocks = (block as any).children || (notionClient ? await fetchAllBlocks(block.id) : [])
        columns = childBlocks.filter((child: any) => child.type === 'column')
      }
      
      if (columns.length === 0) {
        return '<div class="notion-column-list-block">\n[Column List]\n</div>\n\n'
      }
      
      // 컬럼 리스트 HTML 생성
      let columnListHTML = '<div class="notion-column-list-block" style="display: flex; position: relative; flex-grow: 1;">\n'
      
      // 컬럼 너비 계산 (N개 컬럼이면 각각 calc((100% - 46px * (N-1)) / N))
      const resizerWidth = 46
      const resizerCount = columns.length - 1
      const totalResizerWidth = resizerWidth * resizerCount
      const columnWidth = `calc((100% - ${totalResizerWidth}px) / ${columns.length})`
      
      for (let index = 0; index < columns.length; index++) {
        const column = columns[index]
        
        // 컬럼 자식 블록들 처리
        let columnContent = ''
        if (column.has_children) {
          const columnChildBlocks = (column as any).children || (notionClient ? await fetchAllBlocks(column.id) : [])
          const columnChildContent = await Promise.all(
            columnChildBlocks.map((childBlock: any) => convertBlockToText(childBlock, notionClient))
          )
          columnContent = columnChildContent.join('').trim()
        }
        
        // 컬럼 사이의 resizer (첫 번째와 마지막은 제외)
        if (index > 0) {
          columnListHTML += '<div class="notion-column-resizer" style="position: relative; width: 46px; flex-grow: 0; flex-shrink: 0; transition: opacity 200ms ease-out; opacity: 0;"><div style="position: absolute; top: 0px; bottom: 0px; inset-inline-start: 21px; width: 4px; height: 100%; background: var(--ca-darDivCol);"></div></div>\n'
        }
        
        columnListHTML += `<div class="notion-column-block" style="padding-top: 12px; padding-bottom: 12px; flex-grow: 0; flex-shrink: 0; width: ${columnWidth}; transition-duration: 200ms; transition-timing-function: ease; transition-property: width; display: flex; flex-direction: column;">\n${columnContent}\n</div>\n`
      }
      
      columnListHTML += '</div>\n\n'
      return columnListHTML
    
    case 'column':
      // column은 column_list의 자식으로만 처리되므로 여기서는 무시
      return ''
    
    case 'child_database':
      const dbTitle = block.child_database?.title || 'Database'
      return `\n[Database: ${dbTitle}]\n\n`
    
    case 'child_page':
      const pageTitle = block.child_page?.title || 'Page'
      return `\n[Page: ${pageTitle}]\n\n`
    
    case 'synced_block':
      return '\n[Synced Block]\n\n'
    
    case 'template':
      return '\n[Template]\n\n'
    
    case 'unsupported':
      return '\n[Unsupported Block]\n\n'
    
    default:
      return ''
  }
}

export async function getPosts(): Promise<Post[]> {
  // data/posts 디렉토리에서 모든 포스트 파일 읽기
  const postsDir = path.join(process.cwd(), 'data', 'posts')
  
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.json'))
    const posts: Post[] = []
    
    for (const file of files) {
      const filePath = path.join(postsDir, file)
      try {
        const fileContents = fs.readFileSync(filePath, 'utf8')
        const post = JSON.parse(fileContents) as Post
        posts.push(post)
      } catch (error) {
        console.error(`파일 읽기 오류: ${filePath}`, error)
      }
    }
    
    // 날짜 기준으로 정렬 (최신순)
    posts.sort((a, b) => b.date.localeCompare(a.date))
    
    return posts
  }

  // 디렉토리가 없으면 Notion API에서 직접 가져오기
  return await fetchNotionPosts()
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getPosts()
  return posts.find((post) => post.slug === slug) || null
}

export async function getPostById(id: string): Promise<Post | null> {
  const postPath = path.join(process.cwd(), 'data', 'posts', `${id}.json`)
  
  if (fs.existsSync(postPath)) {
    try {
      const fileContents = fs.readFileSync(postPath, 'utf8')
      return JSON.parse(fileContents) as Post
    } catch (error) {
      console.error(`파일 읽기 오류: ${postPath}`, error)
      return null
    }
  }
  
  return null
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const posts = await getPosts()
  return posts.filter((post) => post.category === category)
}

export async function getAllCategories(): Promise<string[]> {
  const posts = await getPosts()
  const categories = new Set<string>()
  posts.forEach((post) => {
    if (post.category) {
      categories.add(post.category)
    }
  })
  return Array.from(categories).sort()
}

export async function getPostsByTag(tag: string): Promise<Post[]> {
  const posts = await getPosts()
  return posts.filter((post) => post.tags && post.tags.includes(tag))
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getPosts()
  const tags = new Set<string>()
  posts.forEach((post) => {
    if (post.tags && post.tags.length > 0) {
      post.tags.forEach((tag) => tags.add(tag))
    }
  })
  return Array.from(tags).sort()
}

