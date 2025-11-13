'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Post } from '@/lib/notion'

interface BackLinkProps {
  post: Post
}

export default function BackLink({ post }: BackLinkProps) {
  const searchParams = useSearchParams()
  const categoryFromQuery = searchParams?.get('category')
  const tagFromQuery = searchParams?.get('tag')
  const searchFromQuery = searchParams?.get('search')
  
  const category = categoryFromQuery ? decodeURIComponent(categoryFromQuery) : null
  const tag = tagFromQuery ? decodeURIComponent(tagFromQuery) : null
  const search = searchFromQuery ? decodeURIComponent(searchFromQuery) : null

  // 목록으로 돌아가기 링크 결정 (검색 우선, 그 다음 태그, 카테고리)
  let backLink = '/'
  if (search) {
    backLink = `/search?q=${encodeURIComponent(search)}`
  } else if (tag) {
    backLink = `/tags?tag=${encodeURIComponent(tag)}`
  } else if (category) {
    backLink = `/categories?category=${encodeURIComponent(category)}`
  }

  return (
    <Link href={backLink} className="back-link">
      <ArrowLeft size={18} className="back-link-icon" />
      목록으로 돌아가기
    </Link>
  )
}

