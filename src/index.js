import { config } from "./config.js";
import app from "./api/app.js";

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Swagger Merge Service is running on port ${PORT}`);
  console.log(`Target Java Service URL: ${config.targetUrl}`);
  console.log(
    `Merged API Docs available at: http://localhost:${PORT}/api-docs/merged`
  );
});
