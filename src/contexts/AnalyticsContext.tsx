"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Analytics {
  pv: number;
  uv: number;
}

interface AnalyticsContextType {
  analytics: Record<string, Analytics>;
  incrementAnalytics: (slug: string) => void;
  isLoading: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  analytics: {},
  incrementAnalytics: () => {},
  isLoading: true
});

export const useAnalytics = () => useContext(AnalyticsContext);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [recordedSlugs, setRecordedSlugs] = useState<Set<string>>(new Set());

  // 初始化时从服务器获取统计数据
  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => {
        const analyticsData: Record<string, Analytics> = {};
        
        // 处理所有文章的PV数据
        Object.entries(data.pv).forEach(([slug, count]) => {
          analyticsData[slug] = {
            pv: count as number,
            uv: 0 // 先初始化为0
          };
        });
        
        // 处理所有文章的UV数据
        Object.entries(data.uv).forEach(([slug, dateCounts]) => {
          const totalUv = Object.values(dateCounts as Record<string, Record<string, true>>)
            .reduce((total, ips) => total + Object.keys(ips).length, 0);
          
          if (analyticsData[slug]) {
            analyticsData[slug].uv = totalUv;
          } else {
            analyticsData[slug] = {
              pv: 0,
              uv: totalUv
            };
          }
        });
        
        setAnalytics(analyticsData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch analytics:', error);
        setIsLoading(false);
      });
  }, []);

  // 根据slug增加统计数据
  const incrementAnalytics = (slug: string) => {
    // 避免重复记录同一个slug
    if (recordedSlugs.has(slug)) return;
    
    // 向服务器发送统计请求
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slug }),
    })
      .then(res => res.json())
      .then(() => {
        // 更新本地状态
        setAnalytics(prev => {
          const newAnalytics = { ...prev };
          if (newAnalytics[slug]) {
            newAnalytics[slug] = {
              pv: newAnalytics[slug].pv + 1,
              uv: newAnalytics[slug].uv // UV由服务器端计算
            };
          } else {
            newAnalytics[slug] = {
              pv: 1,
              uv: 1 // 新文章假设至少有1个UV
            };
          }
          return newAnalytics;
        });
        
        // 记录已处理的slug，避免重复记录
        setRecordedSlugs(prev => new Set(prev).add(slug));
      })
      .catch(error => {
        console.error('Failed to increment analytics:', error);
      });
  };

  return (
    <AnalyticsContext.Provider value={{ analytics, incrementAnalytics, isLoading }}>
      {children}
    </AnalyticsContext.Provider>
  );
} 