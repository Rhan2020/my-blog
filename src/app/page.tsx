"use client";
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import Header from '@/components/Header';

interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
}

// 定义标签映射关系，将相似标签映射到主类别
const TAG_MAPPING: Record<string, string> = {
  // 开发技术类
  "Next.js": "前端开发",
  "CI/CD": "DevOps",
  "部署": "DevOps",
  "缓存": "DevOps",
  "DevOps": "DevOps",
  "nginx": "服务器",
  "https": "服务器",
  "反向代理": "服务器",
  "troubleshooting": "服务器",
  "ssl": "服务器",
  "cicd": "DevOps",
  "pm2": "服务器",
  "architecture": "架构",
  
  // 脚本套利类
  "脚本套利": "数据套利",
  "电商": "数据套利",
  "二手": "数据套利",
  "自动化": "自动化",
  "社交媒体": "内容变现",
  "流量变现": "内容变现",
  "信息差": "数据套利",
  "数据分析": "数据分析",
  "智能化": "自动化",
  "加密": "加密货币",
  "量化": "数据分析",
  "DeFi": "加密货币",
  "算法交易": "数据分析",
  "数字资产": "加密货币",
  "NFT": "加密货币",
  "区块链": "加密货币",
  "虚拟商品": "数字资产",
  "媒体": "内容变现",
  "流量": "内容变现",
  "内容变现": "内容变现",
  "AI": "人工智能",
  "人工智能": "人工智能"
};

// 生成随机的PV/UV数据
const generateRandomStats = () => {
  return {
    pv: Math.floor(Math.random() * 200) + 1,
    uv: Math.floor(Math.random() * 100) + 1
  };
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [pvuv, setPvuv] = useState<Record<string, { pv: number; uv: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const tagsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const postsData = data.posts || [];
        setPosts(postsData);
        setFilteredPosts(postsData);
        
        // 提取标签并映射到主类别
        const tagSet = new Set<string>();
        postsData.forEach((post: Post) => {
          post.tags?.forEach(tag => {
            // 将标签映射到主类别
            const mainCategory = TAG_MAPPING[tag] || tag;
            tagSet.add(mainCategory);
          });
        });
        setAllTags(Array.from(tagSet).sort());
        setIsLoading(false);
        
        // 生成随机的初始PV/UV数据
        const initialPvuv: Record<string, { pv: number; uv: number }> = {};
        postsData.forEach((post: Post) => {
          initialPvuv[post.slug] = generateRandomStats();
        });
        setPvuv(initialPvuv);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // 点击外部关闭标签菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagsMenuRef.current && !tagsMenuRef.current.contains(event.target as Node)) {
        setShowTagsMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 标签过滤逻辑，适应新的标签映射系统
  useEffect(() => {
    if (selectedTag === '') {
      setFilteredPosts(posts);
    } else {
      // 查找所有映射到选中主类别的原始标签
      const relatedTags = Object.entries(TAG_MAPPING)
        .filter(([_, mainCategory]) => mainCategory === selectedTag)
        .map(([tag, _]) => tag);
      
      // 添加选中的主类别本身
      relatedTags.push(selectedTag);
      
      // 筛选包含任一相关标签的文章
      setFilteredPosts(posts.filter(post => 
        post.tags?.some(tag => relatedTags.includes(tag) || TAG_MAPPING[tag] === selectedTag)
      ));
    }
  }, [selectedTag, posts]);

  // 不再获取远程PV/UV数据，使用本地生成的随机数据
  useEffect(() => {
    if (posts.length === 0) return;
    
    // 已在初始化时设置随机数据
    const initialPvuv = { ...pvuv };
    Object.keys(initialPvuv).forEach(key => {
      if (!initialPvuv[key]) {
        initialPvuv[key] = generateRandomStats();
      }
    });
    setPvuv(initialPvuv);
  }, [posts]);

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
    setShowTagsMenu(false);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // 获取标签对应的文章数
  const getTagCount = (tag: string) => {
    // 查找所有映射到这个主类别的原始标签
    const relatedTags = Object.entries(TAG_MAPPING)
      .filter(([_, mainCategory]) => mainCategory === tag)
      .map(([tag, _]) => tag);
    
    // 添加主类别本身
    relatedTags.push(tag);
    
    // 计算包含相关标签的文章数
    return posts.filter(post => 
      post.tags?.some(tag => relatedTags.includes(tag) || TAG_MAPPING[tag] === tag)
    ).length;
  };

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* 页面标题 */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-foreground)' }}>
            博客文章
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-muted)' }}>
            分享技术、思考和经验
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {/* 移动端标签下拉菜单 */}
          <div className="md:hidden relative" ref={tagsMenuRef}>
            <button 
              onClick={() => setShowTagsMenu(!showTagsMenu)}
              className="w-full px-4 py-3 flex justify-between items-center rounded-lg shadow-sm transition-all"
              style={{ 
                backgroundColor: 'var(--color-card)', 
                color: 'var(--color-foreground)',
                borderColor: 'var(--color-border)',
                border: '1px solid var(--color-border)'
              }}
            >
              <span>{selectedTag || '选择标签'}</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`transition-transform ${showTagsMenu ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {showTagsMenu && (
              <div 
                className="absolute z-10 mt-1 w-full rounded-lg shadow-lg overflow-hidden"
                style={{ backgroundColor: 'var(--color-card)' }}
              >
                <div className="max-h-60 overflow-y-auto py-1">
                  <button
                    onClick={() => handleTagClick('')}
                    className="w-full text-left px-4 py-2 transition-colors"
                    style={{ 
                      backgroundColor: selectedTag === '' ? 'var(--color-primary)' : 'transparent',
                      color: selectedTag === '' ? 'white' : 'var(--color-muted)'
                    }}
                  >
                    全部 ({posts.length})
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="w-full text-left px-4 py-2 transition-colors"
                      style={{ 
                        backgroundColor: selectedTag === tag ? 'var(--color-primary)' : 'transparent',
                        color: selectedTag === tag ? 'white' : 'var(--color-muted)'
                      }}
                    >
                      {tag} ({getTagCount(tag)})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 移动端水平标签滚动条 */}
          <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-2 whitespace-nowrap">
              <button
                onClick={() => setSelectedTag('')}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedTag === ''
                    ? 'bg-primary text-white'
                    : 'hover:bg-secondary'
                }`}
                style={selectedTag === '' ? {} : { 
                  color: 'var(--color-muted)',
                  backgroundColor: 'var(--color-secondary)',
                  opacity: 0.8
                }}
              >
                全部
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedTag === tag
                      ? 'bg-primary text-white'
                      : 'hover:bg-secondary'
                  }`}
                  style={selectedTag === tag ? {} : { 
                    color: 'var(--color-muted)',
                    backgroundColor: 'var(--color-secondary)',
                    opacity: 0.8
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* 桌面端侧边栏 - 标签过滤器 */}
            <aside className="hidden md:block md:w-64 shrink-0">
              <div className="sticky top-24">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>
                  标签分类
                </h2>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedTag('')}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      selectedTag === ''
                        ? 'bg-primary text-white'
                        : 'hover:bg-secondary'
                    }`}
                    style={selectedTag === '' ? {} : { 
                      color: 'var(--color-muted)'
                    }}
                  >
                    全部 ({posts.length})
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedTag === tag
                          ? 'bg-primary text-white'
                          : 'hover:bg-secondary'
                      }`}
                      style={selectedTag === tag ? {} : { 
                        color: 'var(--color-muted)'
                      }}
                    >
                      {tag} ({getTagCount(tag)})
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* 文章列表 */}
            <div className="flex-1">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12 rounded-lg border" style={{ 
                  color: 'var(--color-muted)',
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-card)'
                }}>
                  {selectedTag ? `没有找到标签为 "${selectedTag}" 的文章` : '暂无文章'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPosts.map(post => (
                    <Link
                      href={`/${post.slug}`}
                      key={post.slug}
                      className="group"
                    >
                      <article className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col"
                        style={{
                          backgroundColor: 'var(--color-card)',
                        }}
                      >
                        {/* 文章图片占位区域 - 随机图片 */}
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={`https://picsum.photos/800/600?random=${post.slug}`} 
                            alt={post.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute top-4 left-4 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                            {post.tags && post.tags[0] ? (TAG_MAPPING[post.tags[0]] || post.tags[0]) : '文章'}
                          </div>
                        </div>
                        
                        <div className="p-6 flex flex-col flex-grow">
                          <h2 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors" style={{ color: 'var(--color-foreground)' }}>
                            {post.title}
                          </h2>
                          
                          <p className="text-muted mb-4 line-clamp-3" style={{ color: 'var(--color-muted)' }}>
                            {post.description}
                          </p>
                          
                          <div className="flex justify-between items-center mt-auto pt-4">
                            <div className="flex items-center space-x-2">
                              {/* PV、UV 数据展示 */}
                              <div className="flex items-center">
                                <span className="flex items-center text-xs mr-3" style={{ color: 'var(--color-muted)' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                  {pvuv[post.slug]?.pv || 0}
                                </span>
                                <span className="flex items-center text-xs" style={{ color: 'var(--color-muted)' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                  </svg>
                                  {pvuv[post.slug]?.uv || 0}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="12" 
                                height="12" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                className="inline mr-1"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              {formatDate(post.date)}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
