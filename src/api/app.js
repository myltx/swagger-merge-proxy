import express from "express";
import { getMergedSwagger } from "../service/fetcher.js";

const app = express();

// 简单的健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// 合并后的 API 文档接口
// 合并后的 API 文档接口
app.get("/api-docs/merged", async (req, res) => {
  try {
    // 从 Query 中提取可能的配置参数
    const options = {
      targetUrl: req.query.targetUrl, // 如果未传，fetcher 会 fallback 到 global
      apiPrefix: req.query.apiPrefix,
      timeout: req.query.timeout,
      debugLimit: req.query.debugLimit,
      cacheTTL: req.query.cacheTTL,
    };

    const mergedDocs = await getMergedSwagger(options);
    res.json(mergedDocs);
  } catch (error) {
    console.error("Failed to get merged swagger:", error.message);

    // 如果是缺参数，返回 400
    if (error.message.includes("Missing required parameter")) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: "Failed to fetch/merge swagger docs",
      details: error.message,
    });
  }
});

export default app;
