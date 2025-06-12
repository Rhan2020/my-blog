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
  const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(false);
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

  // 骨架屏加载组件
  const SkeletonCard = () => (
    <div className="card animate-pulse">
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded-md w-3/4" style={{ background: 'var(--color-secondary)' }}></div>
        <div className="h-4 bg-gray-200 rounded w-full" style={{ background: 'var(--color-secondary)' }}></div>
        <div className="h-4 bg-gray-200 rounded w-2/3" style={{ background: 'var(--color-secondary)' }}></div>
        <div className="flex justify-between pt-2">
          <div className="h-3 bg-gray-200 rounded w-20" style={{ background: 'var(--color-secondary)' }}></div>
          <div className="h-3 bg-gray-200 rounded w-16" style={{ background: 'var(--color-secondary)' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: 'var(--color-background)' }}>
        {/* 顶部装饰区域 */}
        <div 
          className="relative overflow-hidden py-16"
          style={{
            background: 'var(--gradient-hero)',
          }}
        >
          {/* 背景装饰元素 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white animate-pulse"></div>
            <div className="absolute top-20 right-20 w-24 h-24 rounded-full bg-white animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-10 left-1/3 w-20 h-20 rounded-full bg-white animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fadeInUp">
              🚀 技术探索之旅
            </h1>
            <p className="text-xl text-white/90 mb-8 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              分享技术心得，记录成长足迹，探索未知领域
            </p>
            <div className="animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
              <span className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium">
                📚 共 {posts.length} 篇文章
              </span>
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto py-12 px-6">
          {/* 标签过滤器 */}
          {allTags.length > 0 && (
            <div className="mb-12 animate-fadeInUp">
              <h2 className="text-2xl font-bold mb-6 gradient-text">
                🏷️ 文章分类
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedTag('')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedTag === ''
                      ? 'button-primary scale-105'
                      : 'button-secondary hover:scale-105'
                  }`}
                >
                  🔄 全部 ({posts.length})
                </button>
                {allTags.map(tag => {
                  const count = posts.filter(post => post.tags?.includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        selectedTag === tag
                          ? 'button-primary scale-105'
                          : 'button-secondary hover:scale-105'
                      }`}
                    >
                      #{tag} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 文章列表 */}
          <div className="space-y-8">
            {isLoading ? (
              // 加载骨架屏
              <>
                {[1, 2, 3].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </>
            ) : filteredPosts.length === 0 ? (
              <div 
                className="text-center py-16 animate-fadeInUp"
                style={{ color: 'var(--color-foreground-muted)' }}
              >
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-medium mb-2">
                  {selectedTag ? `没有找到标签为 "${selectedTag}" 的文章` : '暂无文章'}
                </h3>
                <p className="text-sm opacity-70">
                  {selectedTag ? '试试其他标签或查看全部文章' : '精彩内容即将到来，敬请期待！'}
                </p>
              </div>
            ) : (
              filteredPosts.map((post, index) => (
                <Link
                  href={`/${post.slug}`}
                  key={post.slug}
                  className="card block group transition-all duration-300 hover:shadow-2xl animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex flex-col gap-4">
                    {/* 文章标题 */}
                    <div className="flex items-start justify-between gap-4">
                      <h2 
                        className="text-xl font-bold leading-tight group-hover:text-primary transition-colors duration-300"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        {post.title}
                      </h2>
                      {/* 文章统计 */}
                      <div className="flex items-center gap-3 text-xs font-medium opacity-70">
                        <span className="flex items-center gap-1">
                          👁️ {pvuv[post.slug]?.pv ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          👤 {pvuv[post.slug]?.uv ?? 0}
                        </span>
                      </div>
                    </div>
                    
                    {/* 文章描述 */}
                    <p 
                      className="text-base leading-relaxed"
                      style={{ color: 'var(--color-foreground-muted)' }}
                    >
                      {post.description}
                    </p>
                    
                    {/* 标签和日期 */}
                    <div className="flex items-center justify-between gap-4">
                      {/* 标签 */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {post.tags.map(tag => (
                            <span 
                              key={tag} 
                              className="text-xs px-3 py-1 rounded-full font-medium transition-colors duration-200"
                              style={{ 
                                background: 'var(--color-primary-light)', 
                                color: 'var(--color-primary)' 
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* 发布日期 */}
                      <div 
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-foreground-subtle)' }}
                      >
                        📅 {new Date(post.date).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    
                    {/* 阅读更多提示 */}
                    <div className="flex items-center justify-end pt-2">
                      <span 
                        className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        阅读全文 →
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
