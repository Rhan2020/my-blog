"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Analytics {
  pv: number;
  uv: number;
}

interface AnalyticsContextType {
  analytics: Record<string, Analytics>;
  incrementAnalytics: (slug: string) => void;
}

// 生成随机的PV/UV数据
const generateRandomStats = () => {
  return {
    pv: Math.floor(Math.random() * 200) + 1,
    uv: Math.floor(Math.random() * 100) + 1
  };
};

const AnalyticsContext = createContext<AnalyticsContextType>({
  analytics: {},
  incrementAnalytics: () => {}
});

export const useAnalytics = () => useContext(AnalyticsContext);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({});

  // 根据slug生成或更新统计数据
  const incrementAnalytics = (slug: string) => {
    setAnalytics(prev => {
      // 如果已有数据，则增加阅读量
      if (prev[slug]) {
        return {
          ...prev,
          [slug]: {
            pv: prev[slug].pv + 1,
            uv: prev[slug].uv
          }
        };
      }
      
      // 如果是新的slug，生成随机初始数据
      return {
        ...prev,
        [slug]: generateRandomStats()
      };
    });
  };

  return (
    <AnalyticsContext.Provider value={{ analytics, incrementAnalytics }}>
      {children}
    </AnalyticsContext.Provider>
  );
} 