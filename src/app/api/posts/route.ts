import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// 定义类型
interface PostData {
  slug: string;
  title: string;
  description?: string;
  date: string;
  tags?: string[];
  [key: string]: any;
}

interface CachedPost {
  data: any;
  timestamp: number;
}

interface PostsCache {
  allPosts: PostData[] | null;
  timestamp: number;
  singlePosts: Map<string, CachedPost>;
}

// 缓存机制
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
const postsCache: PostsCache = {
  allPosts: null,
  timestamp: 0,
  singlePosts: new Map<string, CachedPost>()
};

// 获取所有文章
async function getAllPosts(): Promise<PostData[]> {
  // 检查缓存是否有效
  const now = Date.now();
  if (postsCache.allPosts && now - postsCache.timestamp < CACHE_TTL) {
    return postsCache.allPosts;
  }
  
  const postsDirectory = path.join(process.cwd(), 'posts');
  const filenames = fs.readdirSync(postsDirectory);
  
  const posts = filenames
    .filter(filename => filename.endsWith('.md'))
    .map(filename => {
      const slug = filename.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      
      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || new Date().toISOString(),
        tags: data.tags || [],
        ...data,
      } as PostData;
    })
    .sort((a, b) => {
      // 按日期降序排序
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  
  // 更新缓存
  postsCache.allPosts = posts;
  postsCache.timestamp = now;
  
  return posts;
}

// 获取单篇文章
async function getPostBySlug(slug: string) {
  // 检查缓存是否有效
  const now = Date.now();
  const cachedPost = postsCache.singlePosts.get(slug);
  if (cachedPost && now - cachedPost.timestamp < CACHE_TTL) {
    return cachedPost.data;
  }
  
  const fullPath = path.join(process.cwd(), 'posts', `${slug}.md`);
  
  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    const post = {
      frontmatter: data,
      content
    };
    
    // 更新缓存
    postsCache.singlePosts.set(slug, {
      data: post,
      timestamp: now
    });
    
    return post;
  } catch (error) {
    return null;
  }
}

// 获取所有文章的API路由
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  
  // 设置缓存头
  const headers = {
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=300'
  };
  
  if (slug) {
    // 获取单篇文章
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404, headers });
    }
    return NextResponse.json(post, { headers });
  } else {
    // 获取所有文章
    const posts = await getAllPosts();
    return NextResponse.json({ posts }, { headers });
  }
}

// 创建文章
export async function POST(request: NextRequest) {
  const { title, content, slug, tags = [] } = await request.json();
  
  if (!title || !content || !slug) {
    return NextResponse.json({ error: 'Title, content and slug are required' }, { status: 400 });
  }
  
  try {
    const fileName = `${slug}.md`;
    const fullPath = path.join(process.cwd(), 'posts', fileName);
    
    // 检查文件是否已存在
    if (fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Post with this slug already exists' }, { status: 409 });
    }
    
    // 创建 frontmatter
    const frontmatter = `---
title: ${title}
date: ${new Date().toISOString()}
tags: ${JSON.stringify(tags)}
---

${content}`;
    
    fs.writeFileSync(fullPath, frontmatter);
    
    // 清除缓存，确保下次获取时重新读取
    postsCache.allPosts = null;
    postsCache.timestamp = 0;
    postsCache.singlePosts.delete(slug);
    
    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 更新文章
export async function PUT(request: NextRequest) {
  const { title, content, slug, tags = [] } = await request.json();
  
  if (!title || !content || !slug) {
    return NextResponse.json({ error: 'Title, content and slug are required' }, { status: 400 });
  }
  
  try {
    const fullPath = path.join(process.cwd(), 'posts', `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // 创建 frontmatter
    const frontmatter = `---
title: ${title}
date: ${new Date().toISOString()}
tags: ${JSON.stringify(tags)}
---

${content}`;
    
    fs.writeFileSync(fullPath, frontmatter);
    
    // 清除缓存，确保下次获取时重新读取
    postsCache.allPosts = null;
    postsCache.timestamp = 0;
    postsCache.singlePosts.delete(slug);
    
    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 删除文章
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }
  
  try {
    const fullPath = path.join(process.cwd(), 'posts', `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    fs.unlinkSync(fullPath);
    
    // 清除缓存，确保下次获取时重新读取
    postsCache.allPosts = null;
    postsCache.timestamp = 0;
    postsCache.singlePosts.delete(slug);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 