"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { remark } from 'remark';
import html from 'remark-html';

interface PostDetail {
  title: string;
  description: string;
  date: string;
  tags?: string[];
  content: string;
}

export default function PostPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] : '';
  const [post, setPost] = useState<PostDetail | null>(null);
  const [contentHtml, setContentHtml] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/posts?slug=${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(async data => {
        setPost({
          title: data.frontmatter.title,
          description: data.frontmatter.description,
          date: data.frontmatter.date,
          tags: data.frontmatter.tags,
          content: data.content,
        });
        const processed = await remark().use(html).process(data.content);
        setContentHtml(processed.toString());
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return <div className="max-w-2xl mx-auto py-10 px-4 text-center text-gray-400">文章未找到</div>;
  if (!post) return <div className="max-w-2xl mx-auto py-10 px-4 text-center text-gray-400">加载中...</div>;

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <span>{new Date(post.date).toLocaleDateString()}</span>
        {post.tags && post.tags.length > 0 && (
          <span className="flex gap-1 flex-wrap">
            {post.tags.map(tag => (
              <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">#{tag}</span>
            ))}
          </span>
        )}
      </div>
      <div className="text-gray-500 mb-6">{post.description}</div>
      <article
        className="prose prose-neutral max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      <PVUV slug={slug} />
    </main>
  );
}

function PVUV({ slug }: { slug: string }) {
  const [pv, setPv] = useState(0);
  const [uv, setUv] = useState(0);

  useEffect(() => {
    if (!slug) return;
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).then(() => {
      fetch(`/api/analytics?slug=${slug}`)
        .then(res => res.json())
        .then(data => {
          setPv(data.pv || 0);
          setUv(data.uv || 0);
        });
    });
  }, [slug]);

  return (
    <div className="mt-8 text-xs text-gray-400">PV: {pv} | UV: {uv}</div>
  );
} 