---
title: "🧩 幽灵代码之谜：CI/CD部署成功但功能失踪的调查"
description: "深入探索Next.js应用部署后新功能未显示的原因，以及如何构建可靠的CI/CD流程"
date: "2025-06-11"
tags: ["Next.js", "CI/CD", "部署", "缓存", "DevOps"]
---

# 🧩✨ 幽灵代码之谜：CI/CD部署成功但功能失踪的调查

## 🔎😱 部署后功能消失的问题

一个普通的开发夜晚，为博客添加了暗夜主题切换和标签分类功能。本地测试一切完美，推送代码后GitHub Actions显示部署成功，打开线上网站准备验证...

结果...

![部署问题](https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=800&q=80)

**🤯 现实情况：** 网站还是原来的样子，没有暗夜主题，没有标签功能！

这种感觉让人困惑，明明部署流程已经顺利完成，为何功能没有显示？

## 🕵️‍♀️🔍 收集问题线索

### 🚦 第一组线索：CI/CD状态异常

```bash
# CI/CD显示的状态
✅ Deploy to Lighweight Cloud
✅ All checks passed
✅ Deployment successful

# 实际验证
curl -s http://localhost:3000 | grep "我的技术博客"  # 返回旧标题
# 而不是预期的 "rshan's blog"
```

明明部署成功了，为什么功能没有显示？这里肯定有蹊跷。

### 📦 第二组线索：依赖问题

尝试清除缓存重新构建时，发现了一系列异常错误：

```bash
❌ Module not found: Can't resolve 'remark-gfm'
❌ Module not found: Can't resolve '@/components/Header'
❌ Error: Cannot find module '@tailwindcss/postcss'
```

这些依赖包不知何故从项目中消失了！

![错误信息](https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&q=80)

## 🔬🔎 问题原因分析

经过排查，确定了三个关键问题：

### 1️⃣ 📁 rsync配置问题

CI/CD使用rsync进行文件同步时，排除了`node_modules`目录：

```yaml
# ⚠️ 有问题的配置
- name: Copy files to server via rsync over SSH
  uses: burnett01/rsync-deployments@7.0.2
  with:
    switches: -avzr --delete --exclude 'node_modules' --exclude '.git'
```

我们排除了`node_modules`目录，却没有在服务器上重新安装依赖！

### 2️⃣ 🗃️ Next.js缓存问题

Next.js的`.next`目录保留了旧的构建缓存，即使代码已经更新，它仍然使用旧版本。

更新代码后未清除构建缓存，导致新功能无法显示。

### 3️⃣ 🔄 PM2重启不完全

使用`pm2 reload`命令时，PM2并没有完全重启应用：

```bash
pm2 reload my-blog  # 看似重启了，但实际没有完全重新加载
```

重载过程不够彻底，无法触发代码的完全更新。

![问题排查](https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80)

## 🛠️💡 解决方案

### ✅ 📦 解决方案1：依赖安装优化

添加专门的依赖安装步骤：

```yaml
- name: 🔨 Install Dependencies and Build
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ***.***.***.***
    username: ubuntu
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /home/ubuntu/my-blog
      echo "==== 检查环境 ===="
      node --version
      npm --version
      
      echo "==== 安装依赖 ===="
      # 优先使用npm ci，失败时回退到npm install
      npm ci --production=false || {
        echo "⚠️ npm ci 失败，尝试更彻底的方式"
        rm -rf node_modules package-lock.json
        npm install
      }
      
      echo "==== 清理缓存 ===="
      rm -rf .next
      
      echo "==== 构建项目 ===="
      npm run build
      
      echo "==== 验证构建结果 ===="
      ls -la .next/
```

这个方案确保了所有依赖都被正确安装，并且清理了所有缓存。

### ✅ 🔄 解决方案2：彻底重启应用

使用更彻底的进程重启方式：

```yaml
- name: 🚀 Start/Reload PM2 Service
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ***.***.***.***
    username: ubuntu
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /home/ubuntu/my-blog
      echo "==== 检查PM2 ===="
      if ! command -v pm2 &> /dev/null; then
        echo "📥 PM2未安装，正在安装"
        sudo npm install -g pm2 || {
          echo "🔄 sudo安装失败，尝试其他方式"
          npm install -g pm2
        }
      fi
      
      echo "==== 停止旧进程 ===="
      pm2 stop my-blog || echo "🛑 没有运行中的进程"
      
      echo "==== 启动新进程 ===="
      pm2 start npm --name "my-blog" -- start || {
        echo "⚠️ 启动失败，检查日志"
        pm2 logs my-blog --lines 10
        exit 1
      }
      
      echo "==== 等待进程启动 ===="
      sleep 5
```

### ✅ 🔍 解决方案3：全面状态检查

添加综合性的应用状态检查：

```yaml
- name: 🩺 应用状态检查
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ***.***.***.***
    username: ubuntu  
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      echo "==== PM2 状态 ===="
      pm2 list
      
      echo "==== 详细进程信息 ===="
      pm2 show my-blog || echo "无法获取进程详情"
      
      echo "==== 端口监听检查 ===="
      lsof -i:3000 || echo "🔌 3000端口未被监听"
      
      echo "==== 应用日志 ===="
      pm2 logs my-blog --lines 20 --nostream || echo "无法获取日志"
      
      echo "==== HTTP访问测试 ===="
      for i in {1..3}; do
        echo "🔄 第 $i 次测试..."
        if curl -I http://localhost:3000; then
          echo "✅ 访问成功"
          break
        else
          echo "⏱️ 无响应，3秒后重试"
          sleep 3
        fi
      done
      
      echo "==== HTTPS测试 ===="
```

## 🔨⚡ 改进CI/CD流程的最佳实践

### 📋 1. 完整的依赖管理

确保你的CI/CD流程考虑到依赖管理的各个方面：

```bash
# 🔄 清理过期依赖
rm -rf node_modules

# 📄 确保package-lock.json存在
[ ! -f package-lock.json ] && npm i --package-lock-only

# 📦 优先使用快速安装
npm ci || npm install

# 🧪 验证依赖
ls -la node_modules | grep next
```

### 🧹 2. 彻底清理缓存

每次部署前彻底清理所有构建缓存：

```bash
# 🗂️ 清理Next.js缓存
rm -rf .next

# 🔄 清理Webpack缓存
rm -rf node_modules/.cache

# ✨ 强制重新构建
NODE_ENV=production npm run build --no-cache
```

### 🧪 3. 全面验证部署结果

不要仅依赖CI/CD状态，添加更多验证步骤：

```bash
# 📋 检查关键文件
ls -la .next/server/pages/index.html || echo "❌ 首页未生成"

# 🧩 验证功能元素
curl -s http://localhost:3000 | grep -q "darkModeToggle" && echo "✅ 暗黑模式组件存在"

# 🔍 检查客户端代码
grep -r "tags" .next/static/chunks/
```

### 📊 4. 监控部署指标

添加量化指标来评估部署质量：

```yaml
echo "==== 部署性能指标 ===="
# 📝 部署时间
echo "部署耗时: $SECONDS 秒"

# 📊 构建大小
echo "构建目录大小:"
du -sh .next/

# 🔢 资源数量
echo "静态资源数量:"
find .next/static -type f | wc -l

# 🚀 首页加载速度
echo "首页响应时间:"
curl -s -w "%{time_total}\n" -o /dev/null http://localhost:3000
```

## 🔧🔒 防止问题再次发生

### 🛡️ 1. 依赖锁定机制

```json
// 📄 package.json 中的锁定配置
{
  "engines": {
    "node": ">=16.0.0 <17.0.0",
    "npm": ">=8.0.0"
  },
  "resolutions": {
    "next": "13.4.12",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

### 📦 2. 使用预构建容器

```yaml
- name: 🐳 使用预构建Docker镜像
  uses: appleboy/ssh-action@v1.0.3
  with:
    script: |
      cd /home/ubuntu
      docker pull myorg/nextjs-blog:latest
      docker stop blog-container || true
      docker rm blog-container || true
      docker run -d --name blog-container -p 3000:3000 myorg/nextjs-blog:latest
```

### 🔁 3. 自动回滚机制

```yaml
- name: ⚠️ 健康检查与回滚
  uses: appleboy/ssh-action@v1.0.3
  with:
    script: |
      # 尝试3次健康检查
      for i in {1..3}; do
        if curl -s http://localhost:3000/api/health | grep -q "ok"; then
          echo "✅ 部署成功"
          exit 0
        fi
        sleep 5
      done
      
      # 健康检查失败，执行回滚
      echo "🔄 健康检查失败，执行回滚"
      cd /home/ubuntu/my-blog
      git reset --hard HEAD~1
      npm ci
      npm run build
      pm2 restart my-blog
      
      # 发送警报
      curl -X POST -H "Content-Type: application/json" \
        -d '{"text":"⚠️ 部署失败，已执行回滚"}' \
        https://hooks.slack.com/services/XXX/YYY/ZZZ
```

### 📝 4. 增强部署日志

```yaml
- name: 📋 部署日志
  uses: appleboy/ssh-action@v1.0.3
  with:
    script: |
      # 创建结构化日志
      DEPLOY_LOG="/home/ubuntu/deploy-logs/$(date +%Y%m%d-%H%M%S).log"
      mkdir -p /home/ubuntu/deploy-logs
      
      {
        echo "==== 部署信息 ===="
        echo "🕒 时间: $(date)"
        echo "👤 用户: ${GITHUB_ACTOR}"
        echo "📌 提交: ${GITHUB_SHA}"
        echo "🔖 版本: $(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[:space:]')"
        
        echo "==== 环境信息 ===="
        echo "💻 主机: $(hostname)"
        echo "📡 IP: $(hostname -I | awk '{print $1}')"
        echo "🔄 Node: $(node -v)"
        echo "📦 NPM: $(npm -v)"
        
        echo "==== 部署结果 ===="
        if [ $? -eq 0 ]; then
          echo "✅ 状态: 成功"
        else
          echo "❌ 状态: 失败"
        fi
      } | tee -a "$DEPLOY_LOG"
      
      # 保留最近10个日志文件
      ls -tp /home/ubuntu/deploy-logs/ | grep -v '/$' | tail -n +11 | xargs -I {} rm -- /home/ubuntu/deploy-logs/{}
```

## 🔮📈 长期解决方案

### 🏗️ 1. 构建持续集成测试

```yaml
# 🧪 部署前自动化测试
- name: 测试部署
  run: |
    npm test
    
    # 启动临时服务器
    npm run build
    npm start &
    PID=$!
    
    # 等待启动
    sleep 10
    
    # 运行E2E测试
    npx cypress run
    
    # 停止服务器
    kill $PID
```

### 🔍 2. 实施金丝雀部署

```yaml
- name: 🐦 金丝雀部署
  uses: appleboy/ssh-action@v1.0.3
  with:
    script: |
      # 部署到金丝雀服务器
      ssh canary-server 'cd /home/ubuntu/my-blog && git pull && npm ci && npm run build && pm2 restart my-blog'
      
      # 验证金丝雀部署
      for i in {1..5}; do
        if curl -s http://canary.myblog.com/api/health | grep -q "ok"; then
          # 金丝雀测试通过，部署到主服务器
          ssh main-server 'cd /home/ubuntu/my-blog && git pull && npm ci && npm run build && pm2 restart my-blog'
          echo "✅ 金丝雀测试通过，已部署到主服务器"
          exit 0
        fi
        sleep 10
      done
      
      echo "❌ 金丝雀测试失败，取消部署"
      exit 1
```

### 🔄 3. 使用蓝绿部署

```yaml
- name: 🔵🟢 蓝绿部署
  uses: appleboy/ssh-action@v1.0.3
  with:
    script: |
      # 确定当前活动环境
      ACTIVE=$(cat /home/ubuntu/active_env)
      
      # 准备非活动环境
      if [ "$ACTIVE" == "blue" ]; then
        TARGET="green"
      else
        TARGET="blue"
      fi
      
      echo "🎯 当前活动: $ACTIVE, 部署目标: $TARGET"
      
      # 部署到非活动环境
      cd /home/ubuntu/my-blog-$TARGET
      git pull
      npm ci
      npm run build
      pm2 start npm --name "my-blog-$TARGET" -- start
      
      # 验证新环境
      sleep 10
      if curl -s http://localhost:3001/api/health | grep -q "ok"; then
        # 切换流量
        echo "✅ 新环境正常，切换流量"
        sed -i "s/$ACTIVE/$TARGET/g" /etc/nginx/conf.d/my-blog.conf
        nginx -s reload
        echo $TARGET > /home/ubuntu/active_env
        
        # 关闭旧环境
        pm2 stop my-blog-$ACTIVE
      else
        echo "❌ 新环境异常，保持当前状态"
        pm2 stop my-blog-$TARGET
      fi
```

## 🏆🎓 经验总结

经历这次排查后，我总结了一些关键经验：

### 🔄 CI/CD工作流程完整性

CI/CD不仅是构建和部署，还需要包含：

1. **📦 依赖管理** - 确保所有必要依赖都被正确安装
2. **🧹 缓存控制** - 适当清理缓存，避免旧版本影响
3. **🔄 完整重启** - 确保应用进程完全重新加载
4. **🧪 部署验证** - 通过多种方式验证部署结果
5. **🔙 回滚机制** - 当部署出现问题时能够快速恢复

### 💡 调试技巧提升

几个调试Next.js应用的关键技巧：

1. **🔍 检查.next目录** - 验证构建是否包含最新代码
   ```bash
   find .next -type f -name "*.js" -exec grep -l "darkModeToggle" {} \;
   ```

2. **🔄 检查运行时环境** - 确认Node.js和依赖版本匹配
   ```bash
   node -e "console.log(require('./package.json').dependencies)"
   ```

3. **📋 检查进程状态** - 确认应用正确运行
   ```bash
   ps aux | grep node
   ```

4. **📊 监控资源使用** - 排除性能或内存问题
   ```bash
   free -m; df -h; top -bn1
   ```

### 🛡️ 预防措施

1. **📝 详细记录部署流程** - 文档化每个步骤
2. **🧪 添加自动化测试** - 特别是针对关键功能
3. **🧰 准备调试工具** - 如健康检查API、诊断脚本
4. **📈 实施监控** - 通过指标及早发现问题

![成功部署](https://images.unsplash.com/photo-1528659882437-b89a74bc157f?w=800&q=80)

## 🚀 最终解决方案的实施

完整的CI/CD流程改进后，确保每次部署都能正确显示新功能：

```yaml
name: 🚀 部署到服务器

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 📥 检出代码
        uses: actions/checkout@v4
        
      - name: 📦 设置Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: 🧪 安装依赖和测试
        run: |
          npm ci
          npm test
          
      - name: 🔍 预检查
        run: |
          echo "==== 📦 检查依赖 ===="
          npm ls next react
          
          echo "==== 📄 检查关键文件 ===="
          test -f next.config.js || { echo "❌ 缺少配置文件"; exit 1; }
          
      - name: 📤 部署到服务器
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/ubuntu/my-blog
            
            # 🔄 拉取最新代码
            git fetch --all
            git reset --hard origin/main
            
            # 📦 安装依赖和构建
            echo "==== 🧹 清理旧文件 ===="
            rm -rf .next node_modules
            
            echo "==== 📥 安装依赖 ===="
            npm ci --production=false
            
            echo "==== 🏗️ 构建应用 ===="
            npm run build
            
            # 🚀 重启应用
            echo "==== 🔄 重启应用 ===="
            pm2 stop my-blog || echo "没有运行中的进程"
            pm2 start npm --name "my-blog" -- start
            
            # ✅ 验证部署
            echo "==== 🧪 验证部署 ===="
            sleep 5
            curl -s http://localhost:3000/api/health
            
            # 📋 记录部署
            echo "$(date): 部署成功 - $(git rev-parse --short HEAD)" >> /home/ubuntu/deploy-history.log
``` 