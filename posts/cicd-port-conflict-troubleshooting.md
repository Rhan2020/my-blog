---
title: "CI/CD部署中的端口冲突问题排查与解决"
date: "2024-12-19"
description: "记录一次生产环境中PM2应用重复启动导致的端口冲突问题的排查和解决过程"
tags: ["CI/CD", "PM2", "Node.js", "部署", "故障排除"]
---

# CI/CD部署中的端口冲突问题排查与解决

## 问题背景

在使用GitHub Actions进行自动化部署时，发现代码提交后CI/CD流程虽然执行成功，但应用实际上并没有正常启动。通过服务器日志发现大量的端口冲突错误：

```
Error: listen EADDRINUSE: address already in use :::3000
```

## 问题分析

### 1. 初步排查

连接到服务器后，使用`pm2 list`命令查看进程状态，发现了一个严重的问题：

```bash
pm2 list
```

结果显示有多达14个同名的`my-blog`进程在运行，这些进程都在尝试监听3000端口，导致了端口冲突。

### 2. 根本原因

分析CI/CD配置文件后发现，问题出现在PM2应用管理逻辑上：

```yaml
- name: Smart PM2 Service Management
  script: |
    if pm2 show my-blog > /dev/null 2>&1; then
      echo "应用已存在，执行重载"
      if pm2 reload my-blog; then
        echo "应用重载成功"
      else
        echo "重载失败，尝试重启"
        pm2 restart my-blog
      fi
    else
      echo "应用不存在，启动新应用"
      pm2 start npm --name "my-blog" -- start
    fi
```

问题在于：
1. `pm2 reload`在某些情况下可能失败
2. 当reload失败时，fallback到`pm2 restart`
3. 但如果restart也失败，CI/CD会继续执行
4. 多次部署累积后，产生了大量僵尸进程

## 解决方案

### 1. 立即修复

首先清理所有重复的进程：

```bash
# 删除所有PM2进程
pm2 delete all

# 确认端口释放
lsof -i:3000 || echo '端口3000已释放'

# 重新启动单个应用
pm2 start npm --name 'my-blog' -- start
```

### 2. 优化CI/CD配置

为了避免类似问题再次发生，需要改进PM2管理逻辑：

```yaml
- name: Robust PM2 Service Management
  script: |
    # 强制清理可能存在的重复进程
    pm2 delete my-blog 2>/dev/null || true
    
    # 等待端口释放
    sleep 2
    
    # 启动新应用
    pm2 start npm --name "my-blog" -- start
    
    # 验证启动状态
    sleep 5
    if ! pm2 show my-blog > /dev/null 2>&1; then
      echo "应用启动失败"
      exit 1
    fi
```

### 3. 添加健康检查

在CI/CD流程中增加更严格的健康检查：

```yaml
- name: 应用健康检查
  script: |
    # 检查PM2状态
    if ! pm2 show my-blog | grep -q "online"; then
      echo "应用未正常运行"
      pm2 logs my-blog --lines 20
      exit 1
    fi
    
    # 检查端口监听
    if ! lsof -i:3000 > /dev/null 2>&1; then
      echo "端口3000未被监听"
      exit 1
    fi
    
    # HTTP健康检查
    for i in {1..5}; do
      if curl -f -s http://localhost:3000 > /dev/null; then
        echo "应用健康检查通过"
        break
      else
        if [ $i -eq 5 ]; then
          echo "应用健康检查失败"
          exit 1
        fi
        sleep 3
      fi
    done
```

## 预防措施

### 1. 监控告警

设置PM2进程数量监控：

```bash
# 检查是否有重复进程
pm2 list | grep my-blog | wc -l
```

### 2. 定期清理

在CI/CD中添加定期清理逻辑：

```bash
# 每次部署前清理僵尸进程
pm2 delete all 2>/dev/null || true
```

### 3. 日志监控

增加对特定错误的监控：

```bash
# 监控端口冲突错误
pm2 logs my-blog | grep "EADDRINUSE"
```

## 经验总结

1. **PM2进程管理需要更加严格**：不能简单依赖reload/restart，必要时应该完全重建
2. **CI/CD流程需要完整的错误处理**：每个步骤都应该有明确的成功/失败判断
3. **健康检查是必须的**：不仅要检查进程状态，还要检查实际的服务可用性
4. **监控和告警很重要**：及时发现问题比事后排查更有价值

## 相关资源

- [PM2官方文档](https://pm2.keymetrics.io/docs/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Node.js端口冲突排查指南](https://nodejs.org/en/docs/guides/debugging-getting-started/)

通过这次问题的排查和解决，我们不仅修复了当前的端口冲突问题，还建立了更加健壮的CI/CD流程，为未来的稳定部署打下了基础。 