import { config } from "./config.js";
import app from "./api/app.js";
import os from "os";

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部 IP 和非 IPv4 地址
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const PORT = config.port;

app.listen(PORT, () => {
  const ip = getLocalIp();
  const host = `http://${ip}:${PORT}`;
  const local = `http://localhost:${PORT}`;

  console.log(`\n🚀 Swagger Merge Service is running!`);
  console.log(`   Local:   ${local}`);
  console.log(`   Network: ${host}`);
  console.log(`\n👉 Dashboard: ${host}/`);
  console.log(`📄 Merged JSON: ${host}/api-docs/merged`);

  if (config.targetUrl) {
    console.log(`\n🔗 Poxing target: ${config.targetUrl}`);
  }
});
