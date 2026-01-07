import axios from "axios";
import _ from "lodash";
import { config as globalConfig } from "../config.js";

// 多目标缓存：Map<string, { data: object, timestamp: number }>
// Key: fullTargetUrl
const cacheMap = new Map();

// 请求合并锁：Map<string, Promise<object>>
// Key: fullTargetUrl
// 用于防止并发请求时重复执行 fetch/merge 逻辑 (Request Coalescing)
const pendingRequests = new Map();

/**
 * 辅助：计算完整的 Target URL
 */
function getFullUrl(targetUrl, apiPrefix) {
  const url = targetUrl.replace(/\/$/, "");
  const prefix = apiPrefix ? apiPrefix.replace(/\/$/, "") : "";
  return prefix.startsWith("/") ? `${url}${prefix}` : `${url}/${prefix}`;
}

/**
 * 获取所有的 Swagger Resources (Groups)
 */
async function fetchSwaggerResources(fullTargetUrl, timeout) {
  try {
    const url = `${fullTargetUrl}/swagger-resources`;
    console.log(`Fetching resources from: ${url}`);
    const response = await axios.get(url, { timeout });
    return response.data;
  } catch (error) {
    console.error("Error fetching swagger-resources:", error.message);
    throw new Error(`Failed to fetch swagger resources from ${fullTargetUrl}`);
  }
}

/**
 * 获取单个 Group 的 Swagger 文档
 */
async function fetchGroupDocs(fullTargetUrl, groupName, timeout) {
  try {
    // 对中文 group 进行 URL 编码
    const encodedGroup = encodeURIComponent(groupName);
    const url = `${fullTargetUrl}/v2/api-docs?group=${encodedGroup}`;
    console.log(`Fetching docs for group: ${groupName} (${url})`);

    const response = await axios.get(url, { timeout });
    return response.data;
  } catch (error) {
    console.error(`Error fetching docs for group ${groupName}:`, error.message);
    // 如果某个 group 失败，可以返回 null 或空对象，避免阻断整体流程
    return null;
  }
}

/**
 * 合并多个 Swagger JSON
 * @param {Array} docsList - Array of { groupName, doc } objects
 */
function mergeSwaggerDocs(docsList) {
  if (!docsList || docsList.length === 0) {
    return null;
  }

  //Find the first valid doc to use as base
  const firstValidEntry = docsList.find((x) => x && x.doc);
  if (!firstValidEntry) return null;
  const baseDoc = firstValidEntry.doc;

  // 初始化基础结构，使用第一个文档作为基底
  const mergedDocs = {
    swagger: "2.0",
    info: {
      title: "Merged API Documentation",
      description:
        "Aggregated Swagger documentation from multiple services/groups.",
      version: "1.0.0",
    },
    host: baseDoc.host,
    basePath: baseDoc.basePath || "/",
    tags: [],
    schemes: baseDoc.schemes || ["http", "https"],
    paths: {},
    definitions: {},
  };

  docsList.forEach(({ groupName, doc }) => {
    if (!doc) return;

    // 1. 合并 Definitions
    if (doc.definitions) {
      // 策略：如果重名，目前简单的覆盖。更复杂的做法是重命名防止冲突。
      Object.assign(mergedDocs.definitions, doc.definitions);
    }

    // 2. 合并 Paths，并注入 groupName tag
    if (doc.paths) {
      // 遍历每个 path
      for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
        // 深度克隆 pathItem
        const newPathItem = _.cloneDeep(pathItem);

        const methods = [
          "get",
          "post",
          "put",
          "delete",
          "patch",
          "options",
          "head",
        ];

        methods.forEach((method) => {
          if (newPathItem[method]) {
            const operation = newPathItem[method];

            if (operation.tags && operation.tags.length > 0) {
              // 将原有的 tags 均转换为 "GroupName/TagName"
              operation.tags = operation.tags.map((tag) => {
                const newTagName = `${groupName}/${tag}`;
                // 将新的 tag 添加到全局 tags 定义中
                if (!mergedDocs.tags.find((t) => t.name === newTagName)) {
                  mergedDocs.tags.push({
                    name: newTagName,
                    description: `Group: ${groupName}, Tag: ${tag}`,
                  });
                }
                return newTagName;
              });
            } else {
              // 如果接口没有 tag，给它一个默认的 Group tag
              const defaultTag = groupName;
              operation.tags = [defaultTag];
              if (!mergedDocs.tags.find((t) => t.name === defaultTag)) {
                mergedDocs.tags.push({
                  name: defaultTag,
                  description: `API Group: ${defaultTag}`,
                });
              }
            }

            // [UI优化] 过滤掉不需要的状态码 '0'，并确保 '200' 排在第一位
            if (operation.responses) {
              const orderedResponses = {};
              const keys = Object.keys(operation.responses);

              // 1. 优先放入 200
              if (keys.includes("200")) {
                orderedResponses["200"] = operation.responses["200"];
              }

              // 2. 放入其他 key，但排除 "0"
              keys.forEach((key) => {
                if (key !== "200" && key !== "0") {
                  orderedResponses[key] = operation.responses[key];
                }
              });

              operation.responses = orderedResponses;
            }
          }
        });

        mergedDocs.paths[pathKey] = newPathItem;
      }
    }

    // 3. 合并 Tags
    if (doc.tags) {
      const existingTagNames = new Set(mergedDocs.tags.map((t) => t.name));
      doc.tags.forEach((tag) => {
        if (!existingTagNames.has(tag.name)) {
          mergedDocs.tags.push(tag);
          existingTagNames.add(tag.name);
        }
      });
    }

    // 4. 合并 Global Responses (修复响应参数丢失问题)
    if (doc.responses) {
      if (!mergedDocs.responses) mergedDocs.responses = {};
      Object.assign(mergedDocs.responses, doc.responses);
    }

    // 5. 合并 Global Parameters
    if (doc.parameters) {
      if (!mergedDocs.parameters) mergedDocs.parameters = {};
      Object.assign(mergedDocs.parameters, doc.parameters);
    }

    // 6. 合并 Security Definitions
    if (doc.securityDefinitions) {
      if (!mergedDocs.securityDefinitions) mergedDocs.securityDefinitions = {};
      Object.assign(mergedDocs.securityDefinitions, doc.securityDefinitions);
    }
  });

  return mergedDocs;
}

/**
 * 主入口：获取并合并文档
 * @param {Object} options - { targetUrl, apiPrefix, timeout, debugLimit, cacheTTL }
 */
export async function getMergedSwagger(options) {
  // 1. 确定最终参数：优先 query 参数，其次全局配置
  const targetUrl = options.targetUrl || globalConfig.targetUrl;
  const apiPrefix = options.apiPrefix ?? globalConfig.apiPrefix; // apiPrefix 可能为空字符串，用 ?? 判断
  const timeout = options.timeout
    ? parseInt(options.timeout)
    : globalConfig.timeout;
  const debugLimit = options.debugLimit
    ? parseInt(options.debugLimit)
    : globalConfig.debugLimit;
  const cacheTTL = options.cacheTTL
    ? parseInt(options.cacheTTL)
    : globalConfig.cacheTTL;

  if (!targetUrl) {
    throw new Error("Missing required parameter: targetUrl");
  }

  const fullTargetUrl = getFullUrl(targetUrl, apiPrefix);
  const cacheKey = fullTargetUrl; // 缓存 Key 只跟 URL 有关即可

  // 1. [Optimization] 检查是否有正在进行的相同请求 (Request Coalescing)
  // 如果有，直接返回那个正在跑的 Promise，避免重复计算造成拥堵
  if (pendingRequests.has(cacheKey)) {
    console.log(`[Coalescing] Reusing pending request for ${fullTargetUrl}`);
    return pendingRequests.get(cacheKey);
  }

  // 2. 检查缓存
  const now = Date.now();
  const cached = cacheMap.get(cacheKey);

  if (cached && now - cached.timestamp < cacheTTL) {
    console.log(`[Cache HIT] ${fullTargetUrl}`);
    return cached.data;
  }
  console.log(`[Cache MISS] ${fullTargetUrl}`);

  // 3. 执行核心逻辑 (包装在 Promise 中以便存入 pendingMap)
  const taskPromise = (async () => {
    try {
      // a) 获取资源列表
      let resources = await fetchSwaggerResources(fullTargetUrl, timeout);

      if (!Array.isArray(resources)) {
        throw new Error(
          "Invalid swagger-resources response. Expected an array."
        );
      }

      // Debug Limit
      if (debugLimit > 0) {
        console.warn(
          `[DEBUG] Limiting fetch to first ${debugLimit} groups for ${fullTargetUrl}`
        );
        resources = resources.slice(0, debugLimit);
      }

      // b) 并行获取 Group 文档
      const fetchPromises = resources.map(async (resource) => {
        const doc = await fetchGroupDocs(fullTargetUrl, resource.name, timeout);
        return { groupName: resource.name, doc };
      });
      const docsResults = await Promise.all(fetchPromises);

      // c) 过滤
      const validDocs = docsResults.filter((item) => item.doc !== null);

      // d) 合并
      const merged = mergeSwaggerDocs(validDocs);

      // 4. 更新缓存
      if (merged) {
        cacheMap.set(cacheKey, {
          data: merged,
          timestamp: Date.now(),
        });

        // 简单的内存防爆
        if (cacheMap.size > 100) {
          cacheMap.clear();
        }
      }

      return merged;
    } finally {
      // 无论成功失败，结束后都要移除锁
      pendingRequests.delete(cacheKey);
    }
  })();

  // 存入 Map
  pendingRequests.set(cacheKey, taskPromise);

  return taskPromise;
}
