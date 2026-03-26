const http = require("http");

const { createApp } = require("./app");
const { getConfig } = require("./config");
const { createWsServer } = require("./realtime/wsServer");
const { startAlertEngine } = require("./services/alertEngine");
const { seedDefaultsIfEmpty } = require("./store/seed");
const { connectMongo } = require("./db/mongoose");

async function main() {
  const config = getConfig();

  // Connect DB first so routes/services have persistence.
  await connectMongo();

  // Seed minimal defaults for out-of-the-box usage.
  await seedDefaultsIfEmpty();

  const app = createApp();
  const server = http.createServer(app);

  // WebSocket server at /ws (compatible with frontend wsClient.js)
  createWsServer({ server, path: "/ws" });

  // Alert engine evaluates rules and emits alerts + realtime events
  startAlertEngine();

  server.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[backend_node_express] listening on port ${config.port} (env=${config.nodeEnv})`
    );
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backend_node_express] fatal:", err);
  process.exit(1);
});
