# swagger-merge-proxy

这是一个独立的 Node.js 服务，用于聚合 Springfox Swagger (v2) 的多模块文档，生成一个合并后的标准 Swagger 2.0 JSON，方便 Apifox 等工具进行统一导入。

## 功能特性

- **自动发现**: 自动拉取 `/swagger-resources` 获取所有 group。
- **编码支持**: 自动处理中文 group 名称的 URL 编码。
- **合并输出**: 将所有 group 的 paths, definitions, tags 合并为一个 JSON。
- **缓存机制**: 默认 5 分钟缓存，避免频繁请求后端 Java 服务。
- **独立运行**: 不侵入原有 Java 项目，作为一个中间层代理运行。
- **并发优化**: 内置 Request Coalescing (请求合并) 机制，防止高并发请求击穿服务器。

## 未来规划 / 优化方向

- [ ] **OpenAPI 3.0 支持**: 引入 `swagger2openapi` 转换库，支持将旧版 Swagger 2.0 自动转换为最新的 OpenAPI 3.0 标准。
- [ ] **多服务聚合**: 支持同时聚合多个微服务地址（Multiple Target URLs）到一个文档中。
- [ ] **鉴权转发**: 支持转发 Header 中的鉴权 Token 到目标服务。

## 系统要求

- **Node.js**: >= 16.0.0

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

你可以通过创建 `.env` 文件来配置（参考 `.env.example`）或直接修改 `src/config.js`，但推荐使用环境变量。

默认配置：

- 目标 Java 服务: `http://localhost:8080`
- 本服务端口: `3000`

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 部署方式

### 方案 A：一键部署到 Vercel (Serverless)

本项目已针对 Vercel Serverless 进行适配，无需通过 `npm start` 监听端口。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmyltx%2Fswagger-merge-proxy)

**配置步骤：**

1. 点击上方按钮，Fork 本仓库到您的 GitHub。
2. 在 Vercel 导入项目时，设置环境变量：
   - `TARGET_URL`: 您的 Java 服务地址 (例如 `http://api.example.com`)
   - `API_PREFIX`: API 前缀 (可选)
3. 部署完成！

### 方案 B：普通服务器部署 (Docker/PM2)

#### 使用 PM2 管理 (推荐)

项目已内置 PM2 配置文件 `ecosystem.config.cjs` 和便捷管理脚本 `service.sh`。

**前置要求**：请确保服务器已全局安装 PM2。

```bash
npm install -g pm2
```

#### 使用 NPM 命令管理 (推荐)

您也可以直接使用 `npm` 命令来管理 PM2 服务，无需记忆 PM2 指令。

```bash
# 启动服务
npm run serve

# 重启
npm run serve:restart

# 停止
npm run serve:stop

# 查看日志
npm run serve:logs
```

#### 使用便捷脚本 (可选)

```bash
# 添加执行权限 (首次)
chmod +x service.sh

# 启动
./service.sh start

# 重启
./service.sh restart

# 停止
./service.sh stop

# 查看日志
./service.sh logs
```

**方式二：使用 PM2 原生命令**

```bash
# 2. 启动服务
pm2 start ecosystem.config.cjs


# 3. 查看状态
pm2 status

# 4. 查看日志
pm2 logs swagger-merge-proxy
```

#### 直接启动

```bash
# 1. 安装依赖
npm install

# 2. 设置环境变量 (或创建 .env)
export TARGET_URL=http://localhost:8080

# 3. 启动
npm start
```

### 4. 使用 Apifox 导入

#### 方式 A：可视化界面 (推荐)

服务提供了一个友好的 Web 界面，用于通过可视化方式生成导入链接。

启动后，直接访问首页：

```
http://localhost:3000/
```

您可以在页面上输入参数，实时预览生成的链接，并一键复制。这是最简单的方式。

#### 方式 B：使用默认配置 (基础用法)

启动后，访问：

```
http://localhost:3000/api-docs/merged
```

此方式将直接使用 `.env` 或环境变量中的 `TARGET_URL` 和 `API_PREFIX` 配置。

#### 方式 C：动态指定目标 (高级用法/跨环境)

您可以在 URL 中通过 Query 参数覆盖默认配置，实现用一个 Node 服务代理多个不同的环境。

**示例 1：代理生产环境**

```
http://localhost:3000/api-docs/merged?targetUrl=http://prod-api.example.com&apiPrefix=/api
```

**示例 2：调试前 2 个 Group**

```
http://localhost:3000/api-docs/merged?debugLimit=2
```

**支持的 Query 参数列表：**

| 参数名       | 说明                        | 示例                  |
| ------------ | --------------------------- | --------------------- |
| `targetUrl`  | 目标服务基础 URL (覆盖默认) | `http://192.168.1.50` |
| `apiPrefix`  | API 前缀                    | `/api`                |
| `timeout`    | 请求超时时间 (毫秒)         | `20000`               |
| `debugLimit` | 调试拉取数量 (0 为不限制)   | `2`                   |
| `cacheTTL`   | 缓存时间 (毫秒)             | `60000`               |

在 Apifox 中选择 "导入数据" -> "URL 导入"，填入上述任一生成的地址即可。

## 配置项详解

| 环境变量 | 描述 | 默认值 |
|Data | Description | Default |
|---|---|---|
| `TARGET_URL` | 目标 Java 服务的域名 | `http://localhost:8080` |
| `API_PREFIX` | 服务的 API 前缀 | `""` (空) |
| `PORT` | 本服务监听端口 | `3000` |
| `CACHE_TTL` | 缓存时间（毫秒） | `300000` (5 分钟) |
| `TIMEOUT` | 请求超时时间（毫秒） | `10000` |

## 目录结构

```
.
├── src
│   ├── api
│   │   └── app.js      # Express 路由逻辑
│   ├── service
│   │   └── fetcher.js  # Swagger 获取与合并核心逻辑
│   ├── config.js       # 配置文件
│   └── index.js        # 入口文件
├── package.json
└── README.md
```
