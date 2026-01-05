#!/bin/bash

# ====================================================
# Swagger Merge Proxy - 服务管理脚本
# 基于 PM2 进行进程管理
# ====================================================

APP_NAME="swagger-merge-proxy"
CONFIG_FILE="ecosystem.config.cjs"

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ 错误: 未检测到 PM2。"
    echo "👉 请先安装 PM2: npm install -g pm2"
    exit 1
fi

case "$1" in
  start)
    echo "🚀 正在启动服务..."
    pm2 start $CONFIG_FILE
    ;;
  stop)
    echo "🛑 正在停止服务..."
    pm2 stop $APP_NAME
    ;;
  restart)
    echo "🔄 正在重启服务..."
    pm2 restart $APP_NAME
    ;;
  reload)
    echo "⚡️ 正在重载配置 (零停机)..."
    pm2 reload $APP_NAME
    ;;
  status)
    pm2 status
    ;;
  logs)
    echo "📋 正在查看日志 (Ctrl+C 退出)..."
    pm2 logs $APP_NAME
    ;;
  *)
    echo "📝 用法: ./service.sh {start|stop|restart|reload|status|logs}"
    echo ""
    echo "   start   - 启动服务"
    echo "   stop    - 停止服务"
    echo "   restart - 重启服务"
    echo "   status  - 查看运行状态"
    echo "   logs    - 查看实时日志"
    exit 1
esac
