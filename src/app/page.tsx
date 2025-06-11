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
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">rshan&apos;s blog</h1>
        
        {/* 标签过滤器 */}
        {allTags.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">标签分类</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag('')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTag === ''
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
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
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
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
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                             {selectedTag ? `没有找到标签为 "${selectedTag}" 的文章` : '暂无文章'}
            </div>
          ) : (
                         filteredPosts.map(post => (
              <Link
                href={`/${post.slug}`}
                key={post.slug}
                className="block rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition bg-white dark:bg-gray-800 p-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{post.title}</span>
                    {post.tags && post.tags.length > 0 && (
                      <span className="ml-2 flex gap-1 flex-wrap">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">#{tag}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">{post.description}</div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mt-2">
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
