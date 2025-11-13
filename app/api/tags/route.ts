import { NextRequest, NextResponse } from 'next/server'
import { getAllTags, getPostsByTag, getPosts } from '@/lib/notion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')

    // tag 쿼리 파라미터가 있으면 해당 태그의 포스트 반환
    if (tag) {
      const decodedTag = decodeURIComponent(tag)
      const posts = await getPostsByTag(decodedTag)
      return NextResponse.json(posts)
    }

    // tag 쿼리 파라미터가 없으면 태그 목록과 개수 반환
    const posts = await getPosts()
    const tags = await getAllTags()
    
    // 태그별 포스트 개수 계산
    const tagCounts: Record<string, number> = {}
    posts.forEach((post) => {
      if (post.tags && post.tags.length > 0) {
        post.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })
    
    // 태그와 개수를 함께 반환
    const tagsWithCounts = tags.map((tag) => ({
      name: tag,
      count: tagCounts[tag] || 0,
    }))
    
    return NextResponse.json(tagsWithCounts)
  } catch (error) {
    console.error('태그/포스트 가져오기 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

