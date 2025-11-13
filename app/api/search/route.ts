import { NextRequest, NextResponse } from 'next/server'
import { getPosts } from '@/lib/notion'
import { Client } from '@notionhq/client'
import { convertBlockToText } from '@/lib/notion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim() === '') {
      return NextResponse.json([])
    }

    const searchTerm = query.trim().toLowerCase()
    const allPosts = await getPosts()
    const results: any[] = []

    for (const post of allPosts) {
      let matchScore = 0
      const matches: string[] = []

      // 제목 검색
      if (post.title.toLowerCase().includes(searchTerm)) {
        matchScore += 10
        matches.push('title')
      }

      // 태그 검색
      if (post.tags && post.tags.length > 0) {
        const tagMatch = post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        if (tagMatch) {
          matchScore += 8
          matches.push('tag')
        }
      }

      // 카테고리 검색
      if (post.category && post.category.toLowerCase().includes(searchTerm)) {
        matchScore += 8
        matches.push('category')
      }

      // 문서 내용 검색 (기존 content 사용, 없으면 블록에서 추출)
      let contentText = ''
      if (post.content) {
        contentText = post.content
      } else if (post.blocks && post.blocks.length > 0) {
        try {
          const notion = new Client({
            auth: process.env.NOTION_API_KEY || '',
          })
          // 블록에서 텍스트만 빠르게 추출 (전체 HTML 변환은 하지 않음)
          for (const block of post.blocks) {
            const blockText = await convertBlockToText(block as any, notion)
            contentText += blockText
            // 성능 최적화: 충분한 텍스트가 모이면 중단
            if (contentText.length > 10000) break
          }
        } catch (error) {
          // 블록 파싱 실패 시 무시
        }
      }

      // HTML 태그 제거하고 텍스트만 추출
      const plainText = contentText.replace(/<[^>]*>/g, '').toLowerCase()
      if (plainText.includes(searchTerm)) {
        matchScore += 5
        matches.push('content')
      }

      // 매칭된 경우 결과에 추가
      if (matchScore > 0) {
        results.push({
          ...post,
          matchScore,
          matches,
        })
      }
    }

    // 점수 순으로 정렬 (높은 점수 우선)
    results.sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json(results)
  } catch (error) {
    console.error('검색 오류:', error)
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
  }
}

