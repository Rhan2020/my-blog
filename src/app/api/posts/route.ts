import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'posts');

// 确保 posts 目录存在
if (!fs.existsSync(postsDirectory)) {
  fs.mkdirSync(postsDirectory, { recursive: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  
  try {
    if (slug) {
      // 获取单篇文章
      const fullPath = path.join(postsDirectory, `${slug}.md`);
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
      
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);
      
      return NextResponse.json({
        slug,
        frontmatter: data,
        content,
        ...data
      });
    } else {
      // 获取所有文章列表
      const fileNames = fs.readdirSync(postsDirectory);
      const posts = fileNames
        .filter(name => name.endsWith('.md'))
        .map(name => {
          const slug = name.replace(/\.md$/, '');
          const fullPath = path.join(postsDirectory, name);
          const fileContents = fs.readFileSync(fullPath, 'utf8');
          const { data } = matter(fileContents);
          
          return {
            slug,
            ...data,
            date: data.date || new Date().toISOString()
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return NextResponse.json({ posts });
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, frontmatter, content } = body;
    
    if (!slug || !content) {
      return NextResponse.json({ error: 'Slug and content are required' }, { status: 400 });
    }
    
    const fileName = `${slug}.md`;
    const fullPath = path.join(postsDirectory, fileName);
    
    // 检查文件是否已存在
    if (fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Post already exists' }, { status: 409 });
    }
    
    // 创建 frontmatter
    const defaultFrontmatter = {
      title: frontmatter?.title || 'Untitled',
      date: frontmatter?.date || new Date().toISOString(),
      tags: frontmatter?.tags || [],
      description: frontmatter?.description || '',
      author: frontmatter?.author || 'Admin',
      published: frontmatter?.published ?? true
    };
    
    // 生成文件内容
    const fileContent = matter.stringify(content, defaultFrontmatter);
    
    // 写入文件
    fs.writeFileSync(fullPath, fileContent);
    
    return NextResponse.json({ 
      message: 'Post created successfully',
      slug,
      frontmatter: defaultFrontmatter
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, frontmatter, content } = body;
    
    if (!slug || !content) {
      return NextResponse.json({ error: 'Slug and content are required' }, { status: 400 });
    }
    
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // 读取现有文件获取原有的 frontmatter
    const existingContent = fs.readFileSync(fullPath, 'utf8');
    const { data: existingFrontmatter } = matter(existingContent);
    
    // 合并 frontmatter
    const updatedFrontmatter = {
      ...existingFrontmatter,
      ...frontmatter,
      updatedAt: new Date().toISOString()
    };
    
    // 生成新的文件内容
    const fileContent = matter.stringify(content, updatedFrontmatter);
    
    // 写入文件
    fs.writeFileSync(fullPath, fileContent);
    
    return NextResponse.json({ 
      message: 'Post updated successfully',
      slug,
      frontmatter: updatedFrontmatter
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }
    
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    fs.unlinkSync(fullPath);
    
    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 