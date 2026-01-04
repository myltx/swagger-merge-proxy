import dotenv from "dotenv";
dotenv.config();

export const config = {
  // Java 服务基础域名 (可选，作为默认值)
  targetUrl: process.env.TARGET_URL,

  // API 前缀
  apiPrefix: process.env.API_PREFIX || "",

  // 本服务端口
  port: process.env.PORT || 3000,

  // 调试模式：限制拉取的 Group 数量，0 或 undefined 表示不限制
  debugLimit: parseInt(process.env.DEBUG_LIMIT || "0", 10),

  // 缓存时间（毫秒），默认5分钟
  cacheTTL: parseInt(process.env.CACHE_TTL || "300000", 10),

  // 请求超时时间
  timeout: parseInt(process.env.TIMEOUT || "10000", 10),
};
