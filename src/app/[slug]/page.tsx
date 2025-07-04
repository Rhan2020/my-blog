"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';
import Prism from 'prismjs';
import Header from '@/components/Header';
import Link from 'next/link';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
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
        setIsLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setIsLoading(false);
      });
  }, [slug]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (notFound) return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-foreground)' }}>文章未找到</h1>
        <p className="mb-8" style={{ color: 'var(--color-muted)' }}>抱歉，您请求的文章不存在或已被删除。</p>
        <Link 
          href="/" 
          className="px-4 py-2 rounded-lg transition-colors"
          style={{ 
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary-foreground)'
          }}
        >
          返回首页
        </Link>
      </div>
    </>
  );
  
  if (isLoading) return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto py-16 px-4 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    </>
  );

  if (!post) return null;

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto py-12 px-4">
        <article className="max-w-3xl mx-auto">
          {/* 文章头部 */}
          <header className="mb-8 pb-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--color-foreground)' }}>{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <time className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {formatDate(post.date)}
              </time>
              <PVUV slug={slug} />
            </div>
            {post.description && (
              <p className="text-lg" style={{ color: 'var(--color-muted)' }}>{post.description}</p>
            )}
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-4">
                {post.tags.map(tag => (
                  <Link 
                    href={`/?tag=${tag}`} 
                    key={tag} 
                    className="px-3 py-1 rounded-full text-xs transition-colors hover:bg-secondary"
                    style={{ 
                      backgroundColor: 'var(--color-secondary)', 
                      color: 'var(--color-muted)' 
                    }}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </header>
          
          {/* 文章内容 */}
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
            ref={(el) => {
              if (el && contentHtml) {
                // Apply syntax highlighting after content is rendered
                const codeBlocks = el.querySelectorAll('pre code');
                codeBlocks.forEach((block) => {
                  Prism.highlightElement(block as Element);
                });
              }
            }}
          />
          
          {/* 文章底部 */}
          <div className="mt-12 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm transition-colors hover:text-primary"
              style={{ color: 'var(--color-muted)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              返回文章列表
            </Link>
          </div>
        </article>
      </main>
      
      {/* 页脚 */}
      <footer className="py-8 border-t mt-12" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p style={{ color: 'var(--color-muted)' }}>© {new Date().getFullYear()} Rshan's Blog. 保留所有权利。</p>
        </div>
      </footer>
    </>
  );
}

function PVUV({ slug }: { slug: string }) {
  const [pv, setPv] = useState(0);
  const [uv, setUv] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
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
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    });
  }, [slug]);

  if (isLoading) {
    return <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>加载中...</span>;
  }

  return (
    <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
      <span>阅读量: {pv}</span>
      <span>访客数: {uv}</span>
    </div>
  );
} 