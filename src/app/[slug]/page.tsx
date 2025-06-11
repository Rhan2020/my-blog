"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';
import Prism from 'prismjs';
import Header from '@/components/Header';

// Import Prism languages
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

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
        // 移除markdown内容中的第一个h1标题，避免重复显示
        const contentWithoutH1 = data.content.replace(/^#\s+.*\n?/m, '');
        const processed = await remark().use(gfm).use(html).process(contentWithoutH1);
        setContentHtml(processed.toString());
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto py-10 px-4 text-center" style={{ color: 'var(--color-muted)' }}>文章未找到</div>
    </>
  );
  if (!post) return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto py-10 px-4 text-center" style={{ color: 'var(--color-muted)' }}>加载中...</div>
    </>
  );

  return (
    <>
      <Header />
        <main className="max-w-2xl mx-auto py-10 px-4">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-foreground)' }}>{post.title}</h1>
          <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
            <span>{new Date(post.date).toLocaleDateString()}</span>
            {post.tags && post.tags.length > 0 && (
              <span className="flex gap-1 flex-wrap">
                {post.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded" style={{ 
                    background: 'var(--color-secondary)', 
                    color: 'var(--color-muted)' 
                  }}>#{tag}</span>
                ))}
              </span>
            )}
          </div>
          <div className="mb-6" style={{ color: 'var(--color-muted)' }}>{post.description}</div>
          <article
            className="prose"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
          <div ref={(el) => {
            if (el && contentHtml) {
              // Apply syntax highlighting after content is rendered
              const codeBlocks = el.querySelectorAll('pre code');
              codeBlocks.forEach((block) => {
                Prism.highlightElement(block as Element);
              });
            }
          }} />
          <PVUV slug={slug} />
        </main>
      </>
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