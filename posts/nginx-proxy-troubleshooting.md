---
title: "🔧 踩坑记录：Docker Nginx代理失效，竟然是HTTPS配置在作妖！"
date: "2025-06-11T19:30:00.000Z"
description: "一个深夜的debug故事：为什么HTTP能访问，HTTPS却404？这场与nginx的斗智斗勇让我学会了..."
tags: ["nginx", "docker", "nextjs", "devops", "troubleshooting"]
author: "Rshan"
published: true
---

# 🔧 踩坑记录：Docker Nginx代理失效，竟然是HTTPS配置在作妖！

## 🌙 深夜的意外发现

又是一个码农的深夜时光，我刚把Next.js博客部署到服务器上，兴奋地想要给朋友炫耀一下我的新博客。结果...

😅 直接访问 `http://43.139.236.77:3000` - 完美运行！  
😱 但访问 `https://rshan.cc` - 404错误页面！  

这就像是你精心准备的晚餐，用自己的盘子吃香喷喷，但一换成客人的盘子就变成了空气...

![服务器配置图](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80)

**我的战场环境：**
- 🏗️ 服务器：腾讯云轻量应用服务器 (Ubuntu 22.04)
- ⚡ Web应用：Next.js 15.3.3 (就是我的心肝宝贝)
- 🐳 反向代理：Docker化的nginx (罪魁祸首)
- 🌐 域名：rshan.cc / www.rshan.cc

## 😤 这场bug给我的下马威

状况简直让人抓狂：

1. ✅ `http://服务器IP:3000` - 乖乖的，能访问
2. ❌ `http://rshan.cc` - 有时候行，有时候不行
3. ❌ `https://rshan.cc` - 死活不听话，直接摆烂

我当时的内心OS：明明代码都一样，为什么HTTP和HTTPS要区别对待我？！

![调试状态](https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80)

## 🕵️‍♂️ 开始我的侦探之旅

### 第一步：先确认"嫌疑人"是否在场

```bash
# 检查我的宝贝Next.js是否还活着
netstat -tlnp | grep :3000
# 输出：tcp6 0 0 :::3000 :::* LISTEN 46450/next-server
# 好的，至少它没有"失踪"

# 检查nginx这个"中介"是否还在工作
docker ps | grep nginx
# 输出：nginx容器正在运行，端口映射80:80,443:443
# 嗯，容器在，但是在摸鱼吗？
```

### 第二步：用curl这个"测谎仪"

```bash
# 测试HTTP，看看nginx有没有在认真工作
curl -I http://rshan.cc
# 返回200 OK - 咦，竟然正常？？？

# 测试HTTPS，给nginx来个突然袭击
curl -I https://rshan.cc
# 返回连接失败 - 果然！HTTPS在装死！
```

我当时就想：HTTP你个叛徒，为什么不跟HTTPS统一战线？😂

![网络请求示意](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80)

### 第三步：深入nginx的老巢

既然是Docker化的nginx，那我得找到它的配置文件藏在哪里：

```bash
# 找nginx的"档案"
docker inspect mcp-nginx | grep -A 10 "Mounts"

# 挖到宝藏：/usr/local/qcloud/lighthouse/.mcp/nginx_conf/conf.d
ls -la /usr/local/qcloud/lighthouse/.mcp/nginx_conf/conf.d/
```

一看这个路径，我就知道这是腾讯云的"作品"，路径比我的代码还复杂 😅

### 第四步：查看"案发现场"

```bash
# 先看看HTTP配置，这个"好孩子"
cat /usr/local/qcloud/lighthouse/.mcp/nginx_conf/conf.d/my-blog.conf
```

**HTTP配置（乖宝宝版本）：**
```nginx
server {
    listen 80;
    server_name www.rshan.cc rshan.cc;

    location / {
        proxy_pass http://172.17.0.1:3000;  # ✅ 乖乖指向3000端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

看起来很正常，该有的都有，proxy_pass也指向了正确的地址。

然后我查看HTTPS配置...

```bash
# 再看看HTTPS配置，这个"问题儿童"
cat /usr/local/qcloud/lighthouse/.mcp/nginx_conf/conf.d/rshan.cc.conf
```

**HTTPS配置（问题儿童版本）：**
```nginx
server {
    listen 443 ssl;
    server_name rshan.cc;
    
    ssl_certificate /etc/nginx/conf.d/rshan.cc_bundle.crt;
    ssl_certificate_key /etc/nginx/conf.d/rshan.cc.key;
    # ... 一堆SSL配置
    
    # ❌ 等等！location在哪里？proxy_pass在哪里？
    # 只有SSL证书配置，完全没有告诉nginx要把请求转发到哪里！
}
```

🤯 **真相大白！** 

HTTPS配置文件就像一个接待员，只负责验证SSL证书，但完全不知道客人来了之后应该把他们带到哪里！所有的HTTPS请求都在nginx这里"迷路"了！

![恍然大悟](https://images.unsplash.com/photo-1553484771-cc0d9b8c2b33?w=800&q=80)

## 💊 治疗这个"健忘症"

### 方案一：给HTTPS配置补脑

我需要告诉HTTPS配置：嘿！别只顾着检查证书，记得把客人带到3000端口去！

```bash
# 给HTTPS配置文件动个"小手术"
sudo sed -i '/ssl_prefer_server_ciphers on;/a\
\
    # 终于想起来要代理到3000端口了\
    location / {\
        proxy_pass http://172.17.0.1:3000;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_set_header X-Forwarded-Host $host;\
        proxy_set_header X-Forwarded-Port $server_port;\
    }\
' /usr/local/qcloud/lighthouse/.mcp/nginx_conf/conf.d/rshan.cc.conf
```

当然，www.rshan.cc.conf也要同样处理，不能厚此薄彼。

### 方案二：让nginx"重新开机"

```bash
# 检查nginx有没有语法错误
docker exec mcp-nginx nginx -t
# nginx: configuration file /etc/nginx/nginx.conf syntax is ok ✅

# 让nginx重新加载配置（相当于重新读取说明书）
docker exec mcp-nginx nginx -s reload
```

### 方案三：验证我的"疗效"

紧张时刻到了...

```bash
# 测试HTTPS，祈祷不要再404
curl -I https://rshan.cc
# HTTP/1.1 200 OK ✅ 成功！！！

curl -I https://www.rshan.cc  
# HTTP/1.1 200 OK ✅ 双杀！！！
```

🎉 **成功！** 我差点激动得要开香槟庆祝！

![庆祝成功](https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80)

## 🎓 这次踩坑教会我的事

### 1. Docker网络不是你想的那样

在Docker环境中，nginx容器要访问宿主机的服务，不能用`127.0.0.1`（那是容器内部），要用Docker网桥IP：

```nginx
proxy_pass http://172.17.0.1:3000;  # ✅ 正确姿势
# 而不是
proxy_pass http://127.0.0.1:3000;   # ❌ 这是在容器里找自己
```

这就像你在酒店房间里点外卖，不能说"送到我家"，要说"送到XX酒店XX房间"。

### 2. HTTP和HTTPS是两个不同的"接待员"

现代nginx部署经常把配置文件分开存储：
- `my-blog.conf` - HTTP专用接待员
- `rshan.cc.conf` - HTTPS主域名接待员  
- `www.rshan.cc.conf` - HTTPS的www子域名接待员

每个接待员都要单独培训，不能指望他们会"心灵感应"！

### 3. 我的调试工具箱

这次事件后，我总结了一套"bug猎手"工具包：

```bash
# 端口侦探
netstat -tlnp | grep :80
netstat -tlnp | grep :3000

# Docker看门人
docker ps
docker logs 容器名
docker exec 容器名 nginx -t

# 网络测试神器
curl -I http://域名
curl -I https://域名
curl -v https://域名  # 详细模式，bug无处遁形
```

### 4. nginx代理的正确打开方式

```nginx
location / {
    proxy_pass http://172.17.0.1:3000;
    
    # 这些header就像是"介绍信"，告诉后端应用：
    proxy_set_header Host $host;                    # 我是代表哪个域名来的
    proxy_set_header X-Real-IP $remote_addr;       # 真正的客户端IP
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # 经过的代理链
    proxy_set_header X-Forwarded-Proto $scheme;    # 原始协议（http/https）
    proxy_set_header X-Forwarded-Host $host;       # 原始主机名
    proxy_set_header X-Forwarded-Port $server_port; # 原始端口
}
```

## 🤔 反思与感悟

这次debug让我深刻体会到：

1. **配置分离的坑**：把HTTP和HTTPS配置分开存储虽然看起来很"专业"，但也容易出现配置不一致的问题。
2. **容器化的复杂性**：Docker虽然好用，但网络配置和文件挂载让调试变得更复杂。
3. **细心的重要性**：很多bug其实就是少了几行配置，但找起来能让人秃头。

最重要的是，**每个踩过的坑都是成长的阶梯**。虽然这个bug让我在深夜抓狂了几个小时，但现在我对nginx代理的理解更深了一层。

下次再遇到类似问题，我就是那个能够一眼看出问题的"老司机"了！😎

![经验值up](https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=800&q=80)

---

**写在最后：** 如果你也遇到了类似的问题，记住这个排查思路：
1. 先确认服务本身是否正常
2. 分别测试HTTP和HTTPS
3. 检查配置文件的完整性
4. 关注Docker网络配置

Bug不可怕，可怕的是不知道怎么调试。愿每个深夜coding的你，都能快速定位问题，早点睡觉！🌙 