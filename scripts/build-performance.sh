#!/bin/bash

# 构建性能监控脚本
# 用于追踪和分析构建时间、缓存命中率等性能指标

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志文件
PERF_LOG="/home/ubuntu/.my-blog-perf.log"
CACHE_FILE="/home/ubuntu/.my-blog-package-cache"

# 开始时间
START_TIME=$(date +%s)
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo -e "${BLUE}🚀 构建性能监控启动${NC}"
echo "构建开始时间: $BUILD_DATE"

# 记录函数
log_metric() {
    local metric="$1"
    local value="$2"
    echo "[$BUILD_DATE] $metric: $value" >> "$PERF_LOG"
}

# 检查package.json变更情况
check_package_changes() {
    echo -e "${YELLOW}📦 检查package.json变更状态${NC}"
    
    if [ -f "$CACHE_FILE" ]; then
        CACHED_MD5=$(cat "$CACHE_FILE")
        CURRENT_MD5=$(md5sum package.json | cut -d' ' -f1)
        
        if [ "$CACHED_MD5" = "$CURRENT_MD5" ]; then
            echo -e "${GREEN}✅ package.json未变更，将跳过依赖安装${NC}"
            log_metric "PACKAGE_CHANGED" "false"
            return 0
        else
            echo -e "${RED}🔄 package.json已变更，需要重新安装依赖${NC}"
            log_metric "PACKAGE_CHANGED" "true"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ 首次运行，需要安装依赖${NC}"
        log_metric "PACKAGE_CHANGED" "first_run"
        return 1
    fi
}

# 检查node_modules状态
check_node_modules() {
    echo -e "${YELLOW}📁 检查node_modules状态${NC}"
    
    if [ -d "node_modules" ]; then
        MODULE_COUNT=$(find node_modules -name "package.json" | wc -l)
        MODULE_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
        echo -e "${GREEN}✅ node_modules存在: $MODULE_COUNT个包, 大小: $MODULE_SIZE${NC}"
        log_metric "NODE_MODULES_SIZE" "$MODULE_SIZE"
        log_metric "NODE_MODULES_COUNT" "$MODULE_COUNT"
        return 0
    else
        echo -e "${RED}❌ node_modules不存在${NC}"
        log_metric "NODE_MODULES_EXISTS" "false"
        return 1
    fi
}

# 检查构建缓存状态
check_build_cache() {
    echo -e "${YELLOW}🏗️ 检查构建缓存状态${NC}"
    
    if [ -d ".next" ]; then
        CACHE_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
        CACHE_FILES=$(find .next -type f | wc -l)
        echo -e "${GREEN}✅ 构建缓存存在: $CACHE_FILES个文件, 大小: $CACHE_SIZE${NC}"
        log_metric "BUILD_CACHE_SIZE" "$CACHE_SIZE"
        log_metric "BUILD_CACHE_FILES" "$CACHE_FILES"
        
        # 检查缓存年龄
        if [ -f ".next/build-manifest.json" ]; then
            CACHE_AGE=$(($(date +%s) - $(stat -c %Y .next/build-manifest.json)))
            echo -e "${BLUE}📅 缓存年龄: ${CACHE_AGE}秒${NC}"
            log_metric "BUILD_CACHE_AGE_SECONDS" "$CACHE_AGE"
        fi
        return 0
    else
        echo -e "${RED}❌ 构建缓存不存在${NC}"
        log_metric "BUILD_CACHE_EXISTS" "false"
        return 1
    fi
}

# 监控依赖安装时间
monitor_install_time() {
    if check_package_changes; then
        echo -e "${GREEN}⏭️ 跳过依赖安装（使用缓存）${NC}"
        log_metric "INSTALL_TIME_SECONDS" "0"
        log_metric "INSTALL_SKIPPED" "true"
        return 0
    fi
    
    echo -e "${YELLOW}⏳ 开始安装依赖...${NC}"
    INSTALL_START=$(date +%s)
    
    # 这里通常会调用npm install
    echo "依赖安装时间监控点（在实际CI中会执行安装）"
    
    INSTALL_END=$(date +%s)
    INSTALL_TIME=$((INSTALL_END - INSTALL_START))
    
    echo -e "${GREEN}✅ 依赖安装完成，耗时: ${INSTALL_TIME}秒${NC}"
    log_metric "INSTALL_TIME_SECONDS" "$INSTALL_TIME"
    log_metric "INSTALL_SKIPPED" "false"
}

# 监控构建时间
monitor_build_time() {
    echo -e "${YELLOW}⏳ 开始构建监控...${NC}"
    BUILD_START=$(date +%s)
    
    # 检查是否需要构建
    BUILD_NEEDED=false
    
    if [ ! -d ".next" ]; then
        echo -e "${YELLOW}🏗️ .next目录不存在，需要构建${NC}"
        BUILD_NEEDED=true
    elif find src app posts -newer .next 2>/dev/null | head -1 | grep -q .; then
        echo -e "${YELLOW}🔄 发现源码变更，需要重新构建${NC}"
        BUILD_NEEDED=true
    else
        echo -e "${GREEN}⏭️ 未发现变更，可跳过构建${NC}"
        BUILD_NEEDED=false
    fi
    
    if [ "$BUILD_NEEDED" = true ]; then
        echo "构建时间监控点（在实际CI中会执行构建）"
        BUILD_END=$(date +%s)
        BUILD_TIME=$((BUILD_END - BUILD_START))
        echo -e "${GREEN}✅ 构建完成，耗时: ${BUILD_TIME}秒${NC}"
        log_metric "BUILD_TIME_SECONDS" "$BUILD_TIME"
        log_metric "BUILD_SKIPPED" "false"
    else
        echo -e "${GREEN}⏭️ 跳过构建（使用缓存）${NC}"
        log_metric "BUILD_TIME_SECONDS" "0"
        log_metric "BUILD_SKIPPED" "true"
    fi
}

# 生成性能报告
generate_report() {
    echo -e "${BLUE}📊 生成性能报告${NC}"
    
    TOTAL_TIME=$(($(date +%s) - START_TIME))
    log_metric "TOTAL_TIME_SECONDS" "$TOTAL_TIME"
    
    echo -e "${GREEN}🎉 总耗时: ${TOTAL_TIME}秒${NC}"
    
    # 显示最近5次构建的性能数据
    if [ -f "$PERF_LOG" ]; then
        echo -e "${BLUE}📈 最近构建性能趋势:${NC}"
        echo "时间 | 总耗时 | 依赖安装 | 构建时间 | 包变更"
        echo "---|---|---|---|---"
        
        tail -n 20 "$PERF_LOG" | grep "TOTAL_TIME_SECONDS" | tail -n 5 | while read line; do
            BUILD_TIME=$(echo "$line" | grep -o '[0-9]\+$')
            BUILD_DATE=$(echo "$line" | cut -d']' -f1 | cut -d'[' -f2)
            echo "$BUILD_DATE | ${BUILD_TIME}s | - | - | -"
        done
    fi
}

# 清理性能日志（可选）
cleanup_logs() {
    if [ -f "$PERF_LOG" ] && [ $(wc -l < "$PERF_LOG") -gt 1000 ]; then
        echo -e "${YELLOW}🧹 清理旧的性能日志${NC}"
        tail -n 500 "$PERF_LOG" > "${PERF_LOG}.tmp"
        mv "${PERF_LOG}.tmp" "$PERF_LOG"
        log_metric "LOG_CLEANED" "true"
    fi
}

# 主执行流程
main() {
    echo -e "${BLUE}=== 构建性能分析报告 ===${NC}"
    
    check_node_modules
    check_build_cache
    monitor_install_time
    monitor_build_time
    generate_report
    cleanup_logs
    
    echo -e "${GREEN}✅ 性能监控完成${NC}"
    echo -e "${BLUE}📋 详细日志: $PERF_LOG${NC}"
}

# 如果脚本被直接执行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 