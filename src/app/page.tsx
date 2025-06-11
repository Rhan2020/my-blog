"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pvuv, setPvuv] = useState<Record<string, { pv: number; uv: number }>>({});

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => setPosts(data.posts || []));
  }, []);

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

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">我的技术博客</h1>
      <div className="space-y-6">
        {posts.map(post => (
          <Link
            href={`/${post.slug}`}
            key={post.slug}
            className="block rounded-lg border border-gray-200 hover:shadow-lg transition bg-white p-6"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{post.title}</span>
                {post.tags && post.tags.length > 0 && (
                  <span className="ml-2 flex gap-1 flex-wrap">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">#{tag}</span>
                    ))}
                  </span>
                )}
              </div>
              <div className="text-gray-500 text-sm">{post.description}</div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                <span>{new Date(post.date).toLocaleDateString()}</span>
                <span>PV: {pvuv[post.slug]?.pv ?? 0}</span>
                <span>UV: {pvuv[post.slug]?.uv ?? 0}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
