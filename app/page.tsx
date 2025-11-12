import Link from 'next/link'
import { getPosts } from '@/lib/notion'

// 날짜 포맷팅 함수
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default async function Home() {
  const posts = await getPosts()

  return (
    <main className="home-container">
      <header className="home-header">
      </header>

      <section className="posts-section">
        {posts.length === 0 ? (
          <p className="no-posts">아직 작성된 글이 없습니다.</p>
        ) : (
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.id} className="post-item">
                <Link href={`/posts/${encodeURIComponent(post.slug)}`} className="post-link">
                  <div className="home-post-content">
                    <h2 className="post-title">{post.title}</h2>
                    <div className="post-meta">
                      <time className="post-date">{formatDate(post.date)}</time>
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="post-tags">
                        {post.tags.map((tag, index) => (
                          <span key={index} className="post-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

