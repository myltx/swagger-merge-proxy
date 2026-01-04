# Swagger Merge Service

这是一个独立的 Node.js 服务，用于聚合 Springfox Swagger (v2) 的多模块文档，生成一个合并后的标准 Swagger 2.0 JSON，方便 Apifox 等工具进行统一导入。

## 功能特性

- **自动发现**: 自动拉取 `/swagger-resources` 获取所有 group。
- **编码支持**: 自动处理中文 group 名称的 URL 编码。
- **合并输出**: 将所有 group 的 paths, definitions, tags 合并为一个 JSON。
- **缓存机制**: 默认 5 分钟缓存，避免频繁请求后端 Java 服务。
- **独立运行**: 不侵入原有 Java 项目，作为一个中间层代理运行。

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

### 4. 使用 Apifox 导入

#### 方式 A：使用默认配置 (基础用法)

启动后，访问：

```
http://localhost:3000/api-docs/merged
```

此方式将直接使用 `.env` 或环境变量中的 `TARGET_URL` 和 `API_PREFIX` 配置。

#### 方式 B：动态指定目标 (高级用法/跨环境)

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
