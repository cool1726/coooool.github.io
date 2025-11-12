import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container">
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666' }}>
          페이지를 찾을 수 없습니다.
        </p>
        <Link href="/" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← 홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}


