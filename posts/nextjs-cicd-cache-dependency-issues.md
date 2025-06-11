---
title: "Next.js CI/CD部署踩坑记：依赖更新与构建缓存问题的完美解决方案"
description: "详细记录Next.js项目在CI/CD自动部署过程中遇到的依赖包缺失和构建缓存问题，以及一套完整的解决方案和最佳实践。"
date: "2025-06-11"
tags: ["Next.js", "CI/CD", "部署", "缓存", "DevOps"]
---

# Next.js CI/CD部署踩坑记：依赖更新与构建缓存问题的完整解决方案

## 问题背景

在为博客项目添加了暗夜主题切换和标签分类功能后，本地开发一切正常，CI/CD流程也显示执行成功，但线上页面却没有更新。经过深入排查发现了两个关键问题：依赖包缺失和构建缓存过期。

## 问题现象

### 1. CI/CD执行成功但功能未生效

```bash
# GitHub Actions显示绿色✅
✅ Deploy to Lighweight Cloud

# 但页面内容仍是旧版本
curl -s http://localhost:3000 | grep "我的技术博客"  # 旧标题
# 而不是期望的 "rshan's blog"
```

### 2. 依赖包缺失导致构建失败

当尝试清除缓存重新构建时，出现了多个模块找不到的错误：

```bash
Module not found: Can't resolve 'remark-gfm'
Module not found: Can't resolve '@/components/Header'
Error: Cannot find module '@tailwindcss/postcss'
```

## 问题根因分析

### 1. rsync部署的局限性

我们的CI/CD使用`rsync`进行文件同步：

```yaml
- name: Copy files to server via rsync over SSH
  uses: burnett01/rsync-deployments@7.0.2
  with:
    switches: -avzr --delete --exclude 'node_modules' --exclude '.git'
```

**问题**：`rsync`会跳过`node_modules`目录，导致新添加的依赖包在服务器上缺失。

### 2. Next.js构建缓存机制

Next.js的`.next`目录包含了构建缓存和预编译文件。当代码更新但缓存未更新时，应用仍然使用旧的构建结果。

### 3. PM2热重载的误区

最初使用`pm2 reload`而不是`pm2 restart`，在某些情况下无法完全重新加载应用代码。

## 解决方案实施

### 第一步：添加依赖安装步骤

在CI/CD流程中添加专门的依赖安装和构建步骤：

```yaml
- name: Install Dependencies and Build
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: 43.139.236.77
    username: ubuntu
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /home/ubuntu/my-blog
      echo "==== 检查Node.js版本 ===="
      node --version
      npm --version
      
      echo "==== 安装/更新依赖 ===="
      # 使用 npm ci 确保依赖版本一致，如果失败则降级到 npm install
      npm ci --production=false || {
        echo "npm ci 失败，尝试使用 npm install"
        rm -rf node_modules package-lock.json
        npm install
      }
      
      echo "==== 清除构建缓存 ===="
      rm -rf .next
      
      echo "==== 重新构建项目 ===="
      npm run build
      
      echo "==== 构建完成，检查构建结果 ===="
      ls -la .next/
```

### 第二步：优化PM2应用管理

改进应用重启逻辑，确保完全重新加载：

```yaml
- name: Start/Reload PM2 Service
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: 43.139.236.77
    username: ubuntu
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /home/ubuntu/my-blog
      echo "==== 检查 PM2 安装状态 ===="
      if ! command -v pm2 &> /dev/null; then
        echo "PM2 未安装，尝试使用 sudo 安装"
        sudo npm install -g pm2 || {
          echo "PM2 安装失败，尝试不使用 sudo"
          npm install -g pm2
        }
      fi
      
      echo "==== 停止现有应用（如果存在）===="
      pm2 stop my-blog || echo "应用未运行或停止失败"
      
      echo "==== 启动应用 ===="
      pm2 start npm --name "my-blog" -- start || {
        echo "启动失败，检查错误日志"
        pm2 logs my-blog --lines 10
        exit 1
      }
      
      echo "==== 等待应用启动 ===="
      sleep 5
```

### 第三步：增强状态检查

添加完善的部署后验证：

```yaml
- name: 应用状态检查
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: 43.139.236.77
    username: ubuntu
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      echo "==== PM2 应用状态 ===="
      pm2 list
      
      echo "==== 应用详细信息 ===="
      pm2 show my-blog || echo "无法获取应用详细信息"
      
      echo "==== 应用端口检查 ===="
      lsof -i:3000 || echo "端口 3000 未被监听"
      
      echo "==== 最近的应用日志 ===="
      pm2 logs my-blog --lines 20 --nostream || echo "无法获取日志"
      
      echo "==== HTTP 访问测试 ===="
      for i in {1..3}; do
        echo "尝试 $i/3..."
        if curl -I http://localhost:3000; then
          echo "HTTP 访问成功！"
          break
        else
          echo "HTTP 访问失败，等待 3 秒后重试..."
          sleep 3
        fi
      done
      
      echo "==== HTTPS 访问测试 ===="
      curl -I https://rshan.cc || echo "HTTPS 访问失败"
      
      echo "==== 部署完成 ===="
      echo "应用已成功部署并启动！"
```

## 解决过程中的关键发现

### 1. npm ci vs npm install

```bash
# 首选：npm ci - 基于 package-lock.json 的精确安装
npm ci --production=false

# 备选：npm install - 更宽松的依赖解析
npm install
```

`npm ci`更适合CI/CD环境，但在某些情况下可能失败，所以采用了fallback策略。

### 2. 构建缓存的重要性

```bash
# 清除缓存确保使用最新代码
rm -rf .next

# 重新构建
npm run build
```

Next.js的增量构建虽然提高了效率，但在部署时可能导致问题。

### 3. PM2重启策略

```bash
# ❌ 不够彻底
pm2 reload my-blog

# ✅ 完全重启
pm2 stop my-blog
pm2 start npm --name "my-blog" -- start
```

## 最佳实践总结

### 1. CI/CD流程设计原则

- **原子性**：每个步骤都应该是独立且完整的
- **幂等性**：多次执行同一操作结果应该一致
- **可观测性**：充分的日志和状态检查
- **容错性**：合理的错误处理和重试机制

### 2. 依赖管理策略

```yaml
# 完整的依赖管理流程
echo "==== 安装/更新依赖 ===="
npm ci --production=false || {
  echo "npm ci 失败，清理后重新安装"
  rm -rf node_modules package-lock.json
  npm install
}
```

### 3. 缓存管理策略

```yaml
# 积极的缓存清理策略
echo "==== 清除构建缓存 ===="
rm -rf .next
rm -rf .next/cache  # 额外清理
```

### 4. 应用重启策略

```yaml
# 保守的重启策略
pm2 stop my-blog || echo "应用未运行"
sleep 2
pm2 start npm --name "my-blog" -- start
sleep 5  # 等待启动完成
```

## 性能影响分析

### 部署时间对比

| 优化前 | 优化后 | 说明 |
|--------|--------|------|
| 2-3分钟 | 4-6分钟 | 增加了依赖安装和构建时间 |
| 失败率高 | 失败率低 | 提高了部署成功率 |
| 调试困难 | 调试简单 | 增加了详细的日志输出 |

### 资源使用

- **CPU**：构建期间短暂增加
- **内存**：PM2重启期间短暂翻倍
- **磁盘**：.next目录重建需要额外空间
- **网络**：依赖下载增加流量

## 进一步优化方向

### 1. 依赖缓存优化

考虑在CI服务器上缓存`node_modules`：

```yaml
# 缓存策略（待实现）
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 2. 增量部署

只在依赖发生变化时才重新安装：

```bash
# 检查依赖是否变化
if ! cmp -s package-lock.json.old package-lock.json; then
  echo "依赖发生变化，重新安装"
  npm ci
fi
```

### 3. 健康检查增强

```bash
# 应用健康检查
curl -f http://localhost:3000/api/health || exit 1
```

## 总结

这次CI/CD问题的解决过程让我深刻理解了几个关键点：

1. **理解工具限制**：rsync、PM2、Next.js缓存机制各有特点
2. **完整性思维**：部署不只是代码同步，还包括依赖、构建、重启、验证
3. **观测性重要**：充分的日志是快速定位问题的关键
4. **渐进式优化**：先保证功能正确，再考虑性能优化

现在的CI/CD流程虽然增加了2-3分钟的部署时间，但大大提高了部署的可靠性和可调试性。在快速迭代的项目中，这个时间成本是完全值得的。

对于类似的Next.js项目，建议在项目初期就建立完善的CI/CD流程，避免后期因为技术债务导致的问题。记住：**一个可靠的部署流程，胜过一个快速但不稳定的流程**。 