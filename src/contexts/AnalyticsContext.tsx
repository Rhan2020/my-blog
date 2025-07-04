"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  // 先生成访客数(UV)，范围1-80
  const uv = Math.floor(Math.random() * 80) + 1;
  
  // 基于访客数生成阅读量(PV)，确保PV >= UV
  // 每个访客平均阅读1-3篇文章
  const readingMultiplier = 1 + Math.random() * 2; // 1.0 - 3.0之间
  const pv = Math.floor(uv * readingMultiplier);
  
  return {
    pv: pv,
    uv: uv
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
    setAnalytics((prev: Record<string, Analytics>) => {
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