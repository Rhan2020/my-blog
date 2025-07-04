"use client";
import Link from 'next/link';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import { useAnalytics } from '@/contexts/AnalyticsContext';

// 内存缓存，避免重复请求
const postsCache = {
  data: null as Post[] | null,
  timestamp: 0
};

// 缓存过期时间（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
}

// 定义标签映射关系，将相似标签映射到主类别（优化为8个主要类别）
const TAG_MAPPING: Record<string, string> = {
  // 技术开发类
  "Next.js": "技术开发",
  "CI/CD": "技术开发", 
  "部署": "技术开发",
  "缓存": "技术开发",
  "DevOps": "技术开发",
  "nginx": "技术开发",
  "https": "技术开发",
  "反向代理": "技术开发",
  "troubleshooting": "技术开发",
  "ssl": "技术开发",
  "cicd": "技术开发",
  "pm2": "技术开发",
  "architecture": "技术开发",
  "故障排除": "技术开发",
  "性能优化": "技术开发",
  "代码质量": "技术开发",
  "前端": "技术开发",
  "后端": "技术开发",
  "全栈": "技术开发",
  
  // AI人工智能类
  "AI": "人工智能",
  "人工智能": "人工智能",
  "机器学习": "人工智能",
  "深度学习": "人工智能",
  "自然语言处理": "人工智能",
  "计算机视觉": "人工智能",
  "智能化": "人工智能",
  "大模型": "人工智能",
  "LLM": "人工智能",
  "GPT": "人工智能",
  "Claude": "人工智能",
  "prompt": "人工智能",
  "提示词": "人工智能",
  
  // 商业分析类
  "脚本套利": "商业分析",
  "电商": "商业分析",
  "二手": "商业分析", 
  "自动化": "商业分析",
  "社交媒体": "商业分析",
  "流量变现": "商业分析",
  "信息差": "商业分析",
  "数据分析": "商业分析",
  "量化": "商业分析",
  "算法交易": "商业分析",
  "媒体": "商业分析",
  "流量": "商业分析",
  "内容变现": "商业分析",
  "服务外包": "商业分析",
  "创业": "商业分析",
  "entrepreneurship": "商业分析",
  "商业模式": "商业分析",
  "市场营销": "商业分析",
  
  // 加密货币类
  "加密": "区块链",
  "DeFi": "区块链",
  "数字资产": "区块链",
  "NFT": "区块链",
  "区块链": "区块链",
  "虚拟商品": "区块链",
  "crypto": "区块链",
  "quant": "区块链",
  "比特币": "区块链",
  "以太坊": "区块链",
  
  // 教育学习类
  "教育": "教育学习",
  "学习": "教育学习",
  "培训": "教育学习",
  "课程": "教育学习",
  "知识管理": "教育学习",
  "技能提升": "教育学习",
  
  // 职业发展类
  "职业": "职业发展",
  "求职": "职业发展",
  "简历": "职业发展",
  "面试": "职业发展",
  "晋升": "职业发展",
  "领导力": "职业发展",
  "团队管理": "职业发展",
  "远程工作": "职业发展",
  
  // 健康医疗类
  "健康": "健康医疗",
  "医疗": "健康医疗",
  "诊断": "健康医疗",
  "治疗": "健康医疗",
  "医学": "健康医疗",
  "药物": "健康医疗",
  "保健": "健康医疗",
  
  // 工具资源类
  "工具": "工具资源",
  "软件": "工具资源",
  "应用": "工具资源",
  "资源": "工具资源",
  "开源": "工具资源",
  "产品": "工具资源",
  "效率": "工具资源",
  "自动化工具": "工具资源"
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const tagsMenuRef = useRef<HTMLDivElement>(null);
  
  // 使用共享的分析数据
  const { analytics, incrementAnalytics, isLoading: analyticsLoading } = useAnalytics();

  // 格式化日期函数
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  // 获取文章列表
  useEffect(() => {
    // 检查缓存是否有效
    const now = Date.now();
    if (postsCache.data && now - postsCache.timestamp < CACHE_TTL) {
      setPosts(postsCache.data);
      setFilteredPosts(postsCache.data);
      
      // 提取标签并映射到主类别
      const tagSet = new Set<string>();
      postsCache.data.forEach((post: Post) => {
        post.tags?.forEach(tag => {
          // 将标签映射到主类别
          const mainCategory = TAG_MAPPING[tag] || tag;
          tagSet.add(mainCategory);
        });
      });
      setAllTags(Array.from(tagSet).sort());
      setIsLoading(false);
      return;
    }
    
    // 缓存无效，从API获取
    setIsLoading(true);
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const postsData = data.posts || [];
        
        // 更新缓存
        postsCache.data = postsData;
        postsCache.timestamp = now;
        
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
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // 更新分析数据
  useEffect(() => {
    if (!analyticsLoading && posts.length > 0) {
      // 只为没有分析数据的文章初始化数据
      posts.forEach((post: Post) => {
        if (!analytics[post.slug]) {
          incrementAnalytics(post.slug);
        }
      });
    }
  }, [posts, analytics, analyticsLoading, incrementAnalytics]);

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

  // 标签过滤逻辑，使用 useMemo 优化性能
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

  const handleTagClick = useCallback((tag: string) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
    setShowTagsMenu(false);
  }, [selectedTag]);

  // 获取标签对应的文章数，使用 useMemo 优化性能
  const getTagCount = useCallback((tag: string) => {
    // 查找所有映射到这个主类别的原始标签
    const relatedTags = Object.entries(TAG_MAPPING)
      .filter(([_, mainCategory]) => mainCategory === tag)
      .map(([originalTag, _]) => originalTag);
    
    // 添加主类别本身
    relatedTags.push(tag);
    
    // 计算包含相关标签的文章数
    return posts.filter(post => 
      post.tags?.some(postTag => relatedTags.includes(postTag) || TAG_MAPPING[postTag] === tag)
    ).length;
  }, [posts]);

  // 预加载文章内容
  const preloadPost = useCallback((slug: string) => {
    // 预加载文章内容
    fetch(`/api/posts?slug=${slug}`).catch(() => {
      // 忽略错误
    });
  }, []);

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
                color: 'var(--color-foreground)'
              }}
            >
              <span>{selectedTag || '所有类别'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            {showTagsMenu && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 p-2 rounded-lg shadow-lg z-10"
                style={{
                  backgroundColor: 'var(--color-card)',
                  color: 'var(--color-foreground)'
                }}
              >
                <button
                  onClick={() => handleTagClick('')}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1 ${selectedTag === '' ? 'font-bold' : ''}`}
                  style={{
                    backgroundColor: selectedTag === '' ? 'var(--color-accent-muted)' : 'transparent',
                    color: selectedTag === '' ? 'var(--color-accent)' : 'var(--color-foreground)'
                  }}
                >
                  所有类别 ({posts.length})
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`w-full text-left px-3 py-2 rounded-md mb-1 ${selectedTag === tag ? 'font-bold' : ''}`}
                    style={{
                      backgroundColor: selectedTag === tag ? 'var(--color-accent-muted)' : 'transparent',
                      color: selectedTag === tag ? 'var(--color-accent)' : 'var(--color-foreground)'
                    }}
                  >
                    {tag} ({getTagCount(tag)})
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* 桌面端标签侧边栏和文章列表 */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* 桌面端标签侧边栏 */}
            <div className="hidden md:block w-full md:w-64 shrink-0">
              <div className="sticky top-8">
                <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-foreground)' }}>分类</h2>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleTagClick('')}
                    className={`text-left px-3 py-2 rounded-md transition-colors ${selectedTag === '' ? 'font-bold' : ''}`}
                    style={{
                      backgroundColor: selectedTag === '' ? 'var(--color-accent-muted)' : 'transparent',
                      color: selectedTag === '' ? 'var(--color-accent)' : 'var(--color-foreground)'
                    }}
                  >
                    所有类别 ({posts.length})
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`text-left px-3 py-2 rounded-md transition-colors ${selectedTag === tag ? 'font-bold' : ''}`}
                      style={{
                        backgroundColor: selectedTag === tag ? 'var(--color-accent-muted)' : 'transparent',
                        color: selectedTag === tag ? 'var(--color-accent)' : 'var(--color-foreground)'
                      }}
                    >
                      {tag} ({getTagCount(tag)})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 文章列表 */}
            <div className="flex-1">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="grid gap-6">
                  {filteredPosts.map((post) => {
                    // 获取文章的PV和UV数据
                    const { pv = 0, uv = 0 } = analytics[post.slug] || {};
                    
                    return (
                      <Link 
                        href={`/${post.slug}`} 
                        key={post.slug}
                        className="block p-6 rounded-lg transition-transform hover:-translate-y-1"
                        style={{ backgroundColor: 'var(--color-card)' }}
                        onMouseEnter={() => preloadPost(post.slug)}
                      >
                        <article>
                          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-foreground)' }}>{post.title}</h2>
                          <div className="flex items-center gap-4 mb-3">
                            <time className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                              {formatDate(post.date)}
                            </time>
                            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                {pv}
                              </span>
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="9" cy="7" r="4"></circle>
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                {uv}
                              </span>
                            </div>
                          </div>
                          {post.description && (
                            <p className="mb-3" style={{ color: 'var(--color-muted)' }}>{post.description}</p>
                          )}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {post.tags.map(tag => (
                                <span 
                                  key={tag}
                                  className="px-2 py-1 rounded-full text-xs"
                                  style={{ 
                                    backgroundColor: 'var(--color-secondary)', 
                                    color: 'var(--color-muted)' 
                                  }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </article>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p style={{ color: 'var(--color-muted)' }}>没有找到符合条件的文章</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* 页脚 */}
      <footer className="py-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p style={{ color: 'var(--color-muted)' }}>© {new Date().getFullYear()} Rshan's Blog. 保留所有权利。</p>
        </div>
      </footer>
    </>
  );
}
