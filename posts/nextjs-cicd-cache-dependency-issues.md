---
title: "🧩 幽灵代码之谜：CI/CD部署成功但功能失踪的调查"
description: "深入探索Next.js应用部署后新功能未显示的原因，以及如何构建可靠的CI/CD流程"
date: "2025-06-11"
tags: ["Next.js", "CI/CD", "部署", "缓存", "DevOps"]
---

# 🧩 幽灵代码之谜：CI/CD部署成功但功能失踪的调查

## 🔎 部署后功能消失的问题

一个普通的开发夜晚，为博客添加了暗夜主题切换和标签分类功能。本地测试一切完美，推送代码后GitHub Actions显示部署成功，打开线上网站准备验证...

结果...🤯

![部署问题](https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=800&q=80)

**现实情况：** 网站还是原来的样子，没有暗夜主题，没有标签功能！

这种感觉让人困惑，明明部署流程已经顺利完成，为何功能没有显示？

## 🕵️ 收集问题线索

### 第一组线索：CI/CD状态异常

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

### 第二组线索：依赖问题

尝试清除缓存重新构建时，发现了一系列异常错误：

```bash
Module not found: Can't resolve 'remark-gfm'
Module not found: Can't resolve '@/components/Header'  
Error: Cannot find module '@tailwindcss/postcss'
```

这些依赖包不知何故从项目中消失了！

![错误信息](https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&q=80)

## 🔬 问题原因分析

经过排查，确定了三个关键问题：

### 1️⃣ rsync配置问题

CI/CD使用rsync进行文件同步时，排除了`node_modules`目录：

```yaml
# 有问题的配置
- name: Copy files to server via rsync over SSH
  uses: burnett01/rsync-deployments@7.0.2
  with:
    switches: -avzr --delete --exclude 'node_modules' --exclude '.git'
```

我们排除了`node_modules`目录，却没有在服务器上重新安装依赖！

### 2️⃣ Next.js缓存问题

Next.js的`.next`目录保留了旧的构建缓存，即使代码已经更新，它仍然使用旧版本。

更新代码后未清除构建缓存，导致新功能无法显示。

### 3️⃣ PM2重启不完全

使用`pm2 reload`命令时，PM2并没有完全重启应用：

```bash
pm2 reload my-blog  # 看似重启了，但实际没有完全重新加载
```

重载过程不够彻底，无法触发代码的完全更新。

![问题排查](https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80)

## 🛠 解决方案

### ✅ 解决方案1：依赖安装优化

添加专门的依赖安装步骤：

```yaml
- name: Install Dependencies and Build
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
        echo "npm ci 失败，尝试更彻底的方式"
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

### ✅ 解决方案2：彻底重启应用

使用更彻底的进程重启方式：

```yaml
- name: Start/Reload PM2 Service  
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ***.***.***.***
    username: ubuntu
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /home/ubuntu/my-blog
      echo "==== 检查PM2 ===="
      if ! command -v pm2 &> /dev/null; then
        echo "PM2未安装，正在安装"
        sudo npm install -g pm2 || {
          echo "sudo安装失败，尝试其他方式"
          npm install -g pm2
        }
      fi
      
      echo "==== 停止旧进程 ===="
      pm2 stop my-blog || echo "没有运行中的进程"
      
      echo "==== 启动新进程 ===="
      pm2 start npm --name "my-blog" -- start || {
        echo "启动失败，检查日志"
        pm2 logs my-blog --lines 10
        exit 1
      }
      
      echo "==== 等待进程启动 ===="
      sleep 5
```

### ✅ 解决方案3：全面状态检查

添加综合性的应用状态检查：

```yaml
- name: 应用状态检查
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
      lsof -i:3000 || echo "3000端口未被监听"
      
      echo "==== 应用日志 ===="
      pm2 logs my-blog --lines 20 --nostream || echo "无法获取日志"
      
      echo "==== HTTP访问测试 ===="
      for i in {1..3}; do
        echo "第 $i 次测试..."
        if curl -I http://localhost:3000; then
          echo "访问成功"
          break
        else
          echo "无响应，3秒后重试"
          sleep 3
        fi
      done
      
      echo "==== HTTPS测试 ===="
      curl -I https://*****.** || echo "外部访问存在问题"
```

![系统检查](https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80)

## 📋 技术要点分析

### 1. npm ci vs npm install对比

```bash
# npm ci: 严格按照package-lock.json安装
npm ci --production=false

# npm install: 更灵活但可能有版本差异
npm install
```

在CI/CD环境中，npm ci提供更高的一致性，但应当准备npm install作为备选方案。前者严格但快速，后者灵活但可能引入版本差异。

### 2. 构建缓存管理

```bash
# 清除缓存
rm -rf .next

# 重新构建
npm run build
```

Next.js的构建缓存可能导致新代码不生效，定期清理非常重要。错误的缓存比没有缓存更危险。

### 3. PM2进程管理最佳实践

```bash
# 温和重启（不够彻底）
pm2 reload my-blog

# 完全重启（更可靠）
pm2 stop my-blog && pm2 start npm --name "my-blog" -- start
```

对于重要更新，完全重启比reload更可靠，能确保应用完全重新加载。

![最佳实践](https://images.unsplash.com/photo-1494949360228-4e9f66b2f32e?w=800&q=80)

## 🔄 实用部署策略

### 1. CI/CD多重保障原则

```
第一保障：依赖同步
第二保障：缓存清理  
第三保障：进程重启
```

关键流程需要多层保障，一个环节出问题时其他环节能够补救。

### 2. 错误处理的备选方案

```bash
# 良好实践：总是有备选方案
npm ci || npm install

# 不推荐：单点失败
npm ci  # 失败时没有后续处理
```

部署脚本应该考虑各种失败情况，并提供恰当的备选方案，避免单点故障。

### 3. 全面的状态验证

```
不要仅依赖CI/CD绿灯，需要多层次验证部署结果
```

除了流程成功的标志，还应检查应用实际状态、端口监听、HTTP响应等多个维度。

![最佳实践图](https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80)

## 🚀 部署流程优化

经过优化，部署流程从基础模式升级为严谨模式：

**优化前：**
- 推送代码，假设一切正常
- 缺少依赖和缓存管理
- 基础检查不足

**优化后：**
- 强制检查依赖完整性
- 强制清理所有缓存
- 完全重启所有进程  
- 全面验证应用状态

现在的部署流程更像一个系统化的工作流：

1. **环境准备** - 检查系统环境和工具
2. **依赖管理** - 清理缓存和安装依赖
3. **构建部署** - 构建和启动应用
4. **状态验证** - 多维度检查应用状态

![流程优化](https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&q=80)

## 📝 实用排查清单

当遇到部署后功能未显示的问题时，可按以下顺序检查：

1. **依赖问题**：使用`npm list`检查包是否完整安装
2. **缓存问题**：`rm -rf .next && npm run build`强制重建
3. **进程问题**：使用`pm2 restart`而非`reload`
4. **网络问题**：使用`curl`测试各种访问路径
5. **日志检查**：`pm2 logs`分析应用日志

### 预防措施

为避免类似问题再次发生：

- **依赖管理**：使用`package-lock.json`锁定版本
- **构建管理**：每次部署都清理缓存重新构建
- **进程管理**：使用`restart`而非`reload`
- **状态监控**：多维度验证部署结果

![预防措施](https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&q=80)

## 📌 总结

这次"幽灵代码"事件揭示了即使是看似简单的前端应用部署，也需要考虑依赖管理、缓存控制和进程管理等多个方面。通过实施更严格的依赖安装、缓存清理和进程管理策略，可以显著提高部署的可靠性。

正如墨菲定律所言："凡是可能出错的事情，一定会出错。"但通过完善的错误处理和状态验证机制，我们可以将潜在问题转化为可控风险，确保部署过程更加稳定可靠。

---

**补充提示**：本文记录的问题和解决方案适用于大多数Node.js应用部署场景，特别是使用Next.js框架的项目。核心原则是确保依赖完整性、清理构建缓存和彻底重启应用进程。 