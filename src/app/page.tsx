"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [pvuv, setPvuv] = useState<Record<string, { pv: number; uv: number }>>({});

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const postsData = data.posts || [];
        setPosts(postsData);
        setFilteredPosts(postsData);
        
        // 提取所有标签
        const tags = new Set<string>();
        postsData.forEach((post: Post) => {
          post.tags?.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
      });
  }, []);

  // 标签过滤逻辑
  useEffect(() => {
    if (selectedTag === '') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.tags?.includes(selectedTag)));
    }
  }, [selectedTag, posts]);

  useEffect(() => {
    if (posts.length === 0) return;
    Promise.all(
      posts.map(post =>
        fetch(`/api/analytics?slug=${post.slug}`)
          .then(res => res.json())
          .then(data => ({ slug: post.slug, pv: data.pv || 0, uv: data.uv || 0 }))
      )
    ).then(arr => {
      const map: Record<string, { pv: number; uv: number }> = {};
      arr.forEach(({ slug, pv, uv }) => {
        map[slug] = { pv, uv };
      });
      setPvuv(map);
    });
  }, [posts]);

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
  };

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto py-10 px-4">
        {/* 标签过滤器 */}
        {allTags.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>标签分类</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag('')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTag === ''
                    ? 'button-primary'
                    : 'button-secondary hover:opacity-80'
                }`}
                style={selectedTag === '' ? {} : { 
                  background: 'var(--color-secondary)', 
                  color: 'var(--color-secondary-foreground)',
                  border: '1px solid var(--color-border)'
                }}
              >
                全部 ({posts.length})
              </button>
              {allTags.map(tag => {
                const count = posts.filter(post => post.tags?.includes(tag)).length;
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTag === tag
                        ? 'button-primary'
                        : 'button-secondary hover:opacity-80'
                    }`}
                    style={selectedTag === tag ? {} : { 
                      background: 'var(--color-secondary)', 
                      color: 'var(--color-secondary-foreground)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {tag} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 文章列表 */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
                        <div className="text-center py-8" style={{ color: 'var(--color-muted)' }}>
              {selectedTag ? `没有找到标签为 "${selectedTag}" 的文章` : '暂无文章'}
            </div>
          ) : (
                         filteredPosts.map(post => (
              <Link
                href={`/${post.slug}`}
                key={post.slug}
                className="card block rounded-lg hover:shadow-lg transition p-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>{post.title}</span>
                    {post.tags && post.tags.length > 0 && (
                      <span className="ml-2 flex gap-1 flex-wrap">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ 
                            background: 'var(--color-secondary)', 
                            color: 'var(--color-muted)' 
                          }}>#{tag}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-muted)' }}>{post.description}</div>
                  <div className="flex items-center gap-4 text-xs mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                    <span>PV: {pvuv[post.slug]?.pv ?? 0}</span>
                    <span>UV: {pvuv[post.slug]?.uv ?? 0}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}
