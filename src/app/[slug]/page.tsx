"use client";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';
import Prism from 'prismjs';
import Header from '@/components/Header';
import Link from 'next/link';
import { useAnalytics } from '@/contexts/AnalyticsContext';

// 预加载 Prism 语言包
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

// 内存缓存，避免重复请求和处理
const postCache = new Map();
const htmlCache = new Map();

interface PostDetail {
  title: string;
  description: string;
  date: string;
  tags?: string[];
  content: string;
}

// 预处理 markdown 内容的函数
const processMarkdown = async (content: string) => {
  if (htmlCache.has(content)) {
    return htmlCache.get(content);
  }
  
  // 移除markdown内容中的第一个h1标题，避免重复显示
  const contentWithoutH1 = content.replace(/^#\s+.*\n?/m, '');
  const processed = await remark().use(gfm).use(html).process(contentWithoutH1);
  const result = processed.toString();
  
  // 缓存结果
  htmlCache.set(content, result);
  return result;
};

export default function PostPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : Array.isArray(params.slug) ? params.slug[0] : '';
  const [post, setPost] = useState<PostDetail | null>(null);
  const [contentHtml, setContentHtml] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { analytics, incrementAnalytics } = useAnalytics();
  const [hasIncremented, setHasIncremented] = useState(false);

  // 格式化日期的函数
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  // 获取文章内容
  useEffect(() => {
    if (!slug) return;
    
    setIsLoading(true);
    setHasIncremented(false);
    
    // 检查缓存
    if (postCache.has(slug)) {
      const cachedPost = postCache.get(slug);
      setPost(cachedPost);
      
      // 处理缓存的内容
      processMarkdown(cachedPost.content)
        .then(html => {
          setContentHtml(html);
          setIsLoading(false);
        });
      
      return;
    }
    
    // 没有缓存，从API获取
    fetch(`/api/posts?slug=${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(async data => {
        const postData = {
          title: data.frontmatter.title,
          description: data.frontmatter.description,
          date: data.frontmatter.date,
          tags: data.frontmatter.tags,
          content: data.content,
        };
        
        // 保存到状态和缓存
        setPost(postData);
        postCache.set(slug, postData);
        
        // 处理并缓存HTML
        const html = await processMarkdown(data.content);
        setContentHtml(html);
        setIsLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setIsLoading(false);
      });
  }, [slug]);

  // 单独处理访问统计的逻辑
  useEffect(() => {
    if (slug && !isLoading && !notFound && !hasIncremented) {
      incrementAnalytics(slug);
      setHasIncremented(true);
    }
  }, [slug, isLoading, notFound, hasIncremented, incrementAnalytics]);

  // 应用语法高亮
  useEffect(() => {
    if (contentHtml) {
      // 使用requestAnimationFrame确保DOM已更新
      requestAnimationFrame(() => {
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
          Prism.highlightElement(block as Element);
        });
      });
    }
  }, [contentHtml]);

  // 获取当前文章的PV和UV数据
  const analyticsData = useMemo(() => {
    return analytics[slug] || { pv: 0, uv: 0 };
  }, [analytics, slug]);

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
              {/* 使用共享的PV/UV数据 */}
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  阅读量: {analyticsData.pv}
                </span>
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  访客数: {analyticsData.uv}
                </span>
              </div>
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
          />
          
          {/* 文章底部 */}
          <div className="mt-12 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button 
              onClick={() => {
                // 优先使用浏览器返回，如果没有历史记录则跳转到首页
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/';
                }
              }}
              className="inline-flex items-center gap-2 text-sm transition-colors hover:text-primary"
              style={{ color: 'var(--color-muted)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              返回文章列表
            </button>
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