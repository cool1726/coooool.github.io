import { NextRequest, NextResponse } from 'next/server'
import { getAllCategories, getPostsByCategory, getPosts } from '@/lib/notion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // category 쿼리 파라미터가 있으면 해당 카테고리의 포스트 반환
    if (category) {
      const decodedCategory = decodeURIComponent(category)
      const posts = await getPostsByCategory(decodedCategory)
      return NextResponse.json(posts)
    }

    // category 쿼리 파라미터가 없으면 카테고리 목록과 개수 반환
    const posts = await getPosts()
    const categories = await getAllCategories()
    
    // 카테고리별 포스트 개수 계산
    const categoryCounts: Record<string, number> = {}
    posts.forEach((post) => {
      if (post.category) {
        categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1
      }
    })
    
    // 카테고리와 개수를 함께 반환
    const categoriesWithCounts = categories.map((cat) => ({
      name: cat,
      count: categoryCounts[cat] || 0,
    }))
    
    return NextResponse.json(categoriesWithCounts)
  } catch (error) {
    console.error('카테고리/포스트 가져오기 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

