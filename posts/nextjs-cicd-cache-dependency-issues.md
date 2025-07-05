---
title: "🧩 幽灵代码之谜：CI/CD部署成功但功能失踪的调查"
description: "深入探索Next.js应用部署后新功能未显示的原因，以及如何构建可靠的CI/CD流程"
date: "2025-06-11"
tags: ["技术开发"]
---

# 🧩✨ 幽灵代码之谜：CI/CD部署成功但功能失踪的调查

## 🔎😱 当代码人间蒸发：部署后功能神秘消失

你有没有经历过这种感觉？辛辛苦苦写好的新功能，本地测试完美无缺，部署流程绿灯全亮，结果打开线上网站一看...

**一切如旧，仿佛你的代码从未存在过！** 😱

这就是我最近遇到的诡异情况。一个平静的夜晚，我为博客添加了炫酷的暗夜主题切换和便捷的标签分类功能。本地测试时，这些功能就像训练有素的士兵一样完美执行每一个命令。推送代码后，GitHub Actions显示部署成功，我满怀期待地打开线上网站准备欣赏自己的杰作...

![部署问题](https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=800&q=80)

**现实却给了我一记重拳：** 网站还是原来的样子，没有暗夜主题，没有标签功能！我的代码仿佛进入了"平行宇宙"，明明存在，却看不见摸不着。

这种感觉就像你精心准备了一场惊喜派对，所有人都说他们来了，但房间里却空无一人。

## 🕵️‍♀️🔍 名侦探上线：收集失踪案件的线索

### 🚦 第一组线索：貌似正常的CI/CD状态

CI/CD面板上的状态一片祥和，仿佛在说"一切尽在掌控之中"：

```bash
# CI/CD显示的状态（就像汽车仪表盘上的所有指示灯都是绿色）
✅ Deploy to Lighweight Cloud
✅ All checks passed
✅ Deployment successful

# 实际验证（但引擎盖下却是另一番景象）
curl -s http://localhost:3000 | grep "我的技术博客"  # 返回旧标题
# 而不是预期的 "rshan's blog"
```

这就像医生告诉你"检查结果一切正常"，但你的头痛却丝毫没有缓解。这里肯定有什么被我们忽略了。

### 📦 第二组线索：消失的依赖包

当我尝试清除缓存重新构建时，系统抛出了一连串的错误信息，就像打开潘多拉魔盒：

```bash
❌ Module not found: Can't resolve 'remark-gfm'
❌ Module not found: Can't resolve '@/components/Header'
❌ Error: Cannot find module '@tailwindcss/postcss'
```

这些依赖包就像是午夜消失的灰姑娘，不知何故从项目中蒸发了！

![错误信息](https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&q=80)

## 🔬🔎 解谜时刻：问题根源大揭秘

经过一番"CSI式"的深入调查，我锁定了三个关键问题，就像找到了案件的三个嫌疑人：

### 1️⃣ 📁 rsync的"选择性失忆"

CI/CD使用rsync进行文件同步时，我们告诉它"忽略node_modules目录"：

```yaml
# ⚠️ 有问题的配置（就像告诉搬家公司"不要搬厨房"，然后抱怨新家没有锅碗瓢盆）
- name: Copy files to server via rsync over SSH
  uses: burnett01/rsync-deployments@7.0.2
  with:
    switches: -avzr --delete --exclude 'node_modules' --exclude '.git'
```

我们排除了`node_modules`目录，却忘了在服务器上重新安装依赖！这就像把食谱发给朋友，但忘了告诉他需要先买食材。

### 2️⃣ 🗃️ Next.js的"顽固记忆"

Next.js的`.next`目录就像一个有选择性记忆的老人，牢牢记住过去的事情，却对新发生的变化视而不见。即使代码已经更新，它仍然使用旧版本的缓存。

这就像你装修了房子，但GPS导航仍然显示旧的布局，导致访客找不到新的客厅。

### 3️⃣ 🔄 PM2的"敷衍重启"

使用`pm2 reload`命令时，PM2并没有彻底重启应用，而是采取了一种"温柔的重启"：

```bash
pm2 reload my-blog  # 看似重启了，实际上只是象征性地拍了拍应用的肩膀
```

这就像你让员工"重新思考这个问题"，但他只是点点头，实际上还在用老方法工作。

![问题排查](https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80)

## 🛠️💡 拯救行动：让消失的功能重见天日

### ✅ 📦 解决方案1：依赖安装"全套服务"

添加一个专门的依赖安装步骤，就像给植物提供阳光、水分和肥料的全套呵护：

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
      # 优先使用npm ci，失败时回退到npm install（就像先尝试快速通道，不行再走常规通道）
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

这个方案确保了所有依赖都被正确安装，并且彻底清理了所有缓存，就像给电脑做了一次完整的"断电重启"。

### ✅ 🔄 解决方案2：PM2的"彻底革命"

不再满足于温和的"重载"，我们需要更彻底的进程重启方式，就像不再只是修剪杂草，而是连根拔起后重新种植：

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

这就像是不再只是敲门提醒，而是彻底地把人叫醒，确保他们真的起床了。

### ✅ 🔍 解决方案3：全方位健康检查

添加一个综合性的应用状态检查，就像医生不仅测量体温，还要检查血压、心率和呼吸：

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
```

## 🎉✨ 胜利时刻：功能重现的喜悦

实施这些解决方案后，我再次部署应用，然后屏住呼吸打开网站...

**瞧！** 暗夜主题和标签功能华丽丽地出现了！就像施了魔法一样，之前"隐形"的代码终于显露出它的真容。

这种感觉就像找到了丢失多日的钥匙，或者终于解开了一个卡了很久的拼图 — 那种"啊哈"时刻的满足感无与伦比。

## 🧠💭 经验与教训：CI/CD的生存法则

通过这次"幽灵代码"事件，我总结了几条宝贵的CI/CD生存法则：

1. **📦 依赖管理要彻底** - 不要假设依赖会自动出现，就像不要期望冰箱会自动填满食物
2. **🧹 缓存清理要及时** - 定期清理缓存，就像定期清理衣柜里不再穿的衣服
3. **🔄 重启要彻底** - 有时候"温和的重启"不够，需要"彻底的重生"
4. **🔍 验证要全面** - 不仅看进程是否运行，还要看功能是否可用，就像不仅看车子是否启动，还要看它能否行驶
5. **📝 日志要详尽** - 详细的日志就像面包屑，帮助你在迷宫中找到回家的路

## 🤔💬 你的部署流程健康吗？

看完我的故事，不妨反思一下你自己的CI/CD流程：

- 你的部署流程是否有完善的依赖管理策略？
- 你是否定期清理构建缓存？
- 你的应用重启是否足够彻底？
- 你的健康检查是否全面？

欢迎在评论区分享你的"部署灵异事件"和解决方法！毕竟，程序员的成长，往往来自于那些让人抓狂的bug和意外情况。😄

---

记住，一个可靠的CI/CD流程就像一个尽职的管家 — 不仅要把客人迎进门，还要确保他们有舒适的座位、美味的食物和愉快的体验。只有全方位的关怀，才能确保你的代码不会成为"幽灵"！ 