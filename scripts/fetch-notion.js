require('dotenv').config({ path: '.env.local' })
const { Client } = require('@notionhq/client')
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
})

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  console.error('환경변수가 설정되지 않았습니다.')
  console.error('NOTION_API_KEY와 NOTION_DATABASE_ID를 .env.local 파일에 설정해주세요.')
  process.exit(1)
}

// 블록에서 첫 번째 이미지 URL 추출
function extractFirstImage(blocks) {
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

async function fetchAllBlocks(blockId, includeChildren = true) {
  let allBlocks = []
  let cursor = undefined

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    })
    
    const blocks = response.results
    
    // 자식 블록도 재귀적으로 가져오기
    if (includeChildren) {
      for (const block of blocks) {
        if (block.has_children) {
          block.children = await fetchAllBlocks(block.id, includeChildren)
        }
      }
    }
    
    allBlocks = allBlocks.concat(blocks)
    cursor = response.next_cursor
  } while (cursor)

  return allBlocks
}

async function fetchNotionPosts(filterDate = null, fetchAll = false) {
  try {
    if (fetchAll) {
      console.log('모든 포스트를 가져오는 중...')
    } else if (filterDate) {
      console.log(`${filterDate} 이후 포스트를 가져오는 중...`)
    } else {
      console.log('오늘 이후 포스트를 가져오는 중...')
    }
    
    // 필터 날짜 설정
    let filterDateValue = null
    if (fetchAll) {
      // 모든 포스트 가져오기 - 날짜 필터 없음
      filterDateValue = null
    } else if (filterDate) {
      // 지정된 날짜 이후
      filterDateValue = filterDate
    } else {
      // 기본값: 오늘 날짜 (YYYY-MM-DD 형식)
      filterDateValue = dayjs().format('YYYY-MM-DD')
    }
    
    // 필터 구성
    const filterConditions = [
      {
        property: 'Status',
        status: {
          equals: 'Published',
        },
      },
    ]
    
    // 날짜 필터 추가 (fetchAll이 아닐 때만)
    if (!fetchAll && filterDateValue) {
      filterConditions.push({
        property: 'Last Updated',
        date: {
          on_or_after: filterDateValue,
        },
      })
    }
    
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        and: filterConditions,
      },
      sorts: [
        {
          property: 'Last Updated',
          direction: 'descending',
        },
      ],
    })

    const posts = []

    for (const page of response.results) {
      const pageId = page.id
      
      console.log(`페이지 처리 중: ${pageId}`)
      
      // 페이지 내용 가져오기
      const blocks = await fetchAllBlocks(pageId)

      const titleProperty = page.properties.Title
      const publishedDateProperty = page.properties['Published Date']
      const lastUpdatedProperty = page.properties['Last Updated']
      const tagsProperty = page.properties.Tags
      const authorProperty = page.properties.Author
      const readingTimeProperty = page.properties['Estimated Reading Time']

      const title = titleProperty?.title?.[0]?.plain_text || '제목 없음'
      // Published Date가 있으면 사용하고, 없으면 Last Updated 사용
      const date = publishedDateProperty?.date?.start || 
                   lastUpdatedProperty?.date?.start || 
                   dayjs().format('YYYY-MM-DD')

      // Tags 필드에서 태그 추출
      const tags = []
      if (tagsProperty?.multi_select) {
        tags.push(...tagsProperty.multi_select.map(tag => tag.name))
      }

      // Author 필드에서 저자 추출
      let author
      if (authorProperty?.rich_text?.[0]?.plain_text) {
        author = authorProperty.rich_text[0].plain_text
      } else if (authorProperty?.title?.[0]?.plain_text) {
        author = authorProperty.title[0].plain_text
      } else if (authorProperty?.select?.name) {
        author = authorProperty.select.name
      }

      // Estimated Reading Time 필드에서 소요시간 추출 (분 단위)
      let readingTime
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
        readingTime,
        thumbnail,
        blocks,
      })

      console.log(`✓ ${title}`)
    }

    // data/posts 디렉토리가 없으면 생성
    const postsDir = path.join(process.cwd(), 'data', 'posts')
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true })
    }

    // 기존에 있던 포스트 파일 목록 가져오기
    const existingFiles = fs.existsSync(postsDir) 
      ? fs.readdirSync(postsDir).filter(file => file.endsWith('.json'))
      : []
    const fetchedIds = new Set(posts.map(post => post.id))
    
    // 각 포스트를 개별 JSON 파일로 저장
    for (const post of posts) {
      const filePath = path.join(postsDir, `${post.id}.json`)
      fs.writeFileSync(filePath, JSON.stringify(post, null, 2), 'utf8')
    }

    // Notion에서 가져오지 않은 기존 파일 삭제
    let deletedCount = 0
    if (!fetchAll) {
      // fetchAll이 아닐 때만 기존 파일 삭제 (전체 가져오기 시에는 삭제하지 않음)
      for (const file of existingFiles) {
        const fileId = file.replace('.json', '')
        if (!fetchedIds.has(fileId)) {
          const filePath = path.join(postsDir, file)
          fs.unlinkSync(filePath)
          deletedCount++
        }
      }
    }
    
    console.log(`\n✓ 총 ${posts.length}개의 포스트를 ${postsDir}에 저장했습니다.`)
    if (deletedCount > 0) {
      console.log(`✓ ${deletedCount}개의 오래된 포스트 파일을 삭제했습니다.`)
    }
    
    return posts
  } catch (error) {
    console.error('Notion API 오류:', error)
    throw error
  }
}

// 날짜 형식 변환 함수 (YYYYMMDD -> YYYY-MM-DD)
function parseDate(dateString) {
  if (!dateString || dateString.length !== 8) {
    return null
  }
  
  // dayjs로 날짜 파싱 및 유효성 검사
  const parsed = dayjs(dateString, 'YYYYMMDD', true)
  
  if (!parsed.isValid()) {
    return null
  }
  
  return parsed.format('YYYY-MM-DD')
}

// 메인 실행 부분
const args = process.argv.slice(2)
let filterDate = null
let fetchAll = false

if (args.length > 0) {
  const arg = args[0].toLowerCase()
  
  if (arg === 'all') {
    fetchAll = true
    console.log('모든 포스트를 가져오는 모드로 실행합니다.')
  } else {
    // 날짜 형식 파싱 시도
    const parsedDate = parseDate(arg)
    if (parsedDate) {
      filterDate = parsedDate
      console.log(`${filterDate} 이후 포스트를 가져오는 모드로 실행합니다.`)
    } else {
      console.error('잘못된 파라미터입니다.')
      console.error('사용법:')
      console.error('  npm run fetch-notion          - 오늘 이후 포스트 가져오기')
      console.error('  npm run fetch-notion all      - 모든 포스트 가져오기')
      console.error('  npm run fetch-notion 20251101 - 2025-11-01 이후 포스트 가져오기')
      process.exit(1)
    }
  }
}

fetchNotionPosts(filterDate, fetchAll)
  .then(() => {
    console.log('완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('오류 발생:', error)
    process.exit(1)
  })

