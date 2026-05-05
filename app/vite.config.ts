import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev-only plugin that mounts the API endpoints.
 * Production deploys should expose handleBrief / handleProbe via serverless
 * functions or a small Express/Hono server — the contracts are identical.
 */
function llgApi(): PluginOption {
  return {
    name: "llg:api",
    apply: "serve",
    configureServer(server) {
      const ndjsonError = (res: import("node:http").ServerResponse, err: unknown) => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/x-ndjson");
        }
        res.write(
          JSON.stringify({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          }) + "\n",
        );
        res.end();
      };

      server.middlewares.use("/api/brief", async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
          const { handleBrief } = await server.ssrLoadModule("/server/handler.ts");
          await handleBrief(req, res);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("brief handler crashed:", err);
          ndjsonError(res, err);
        }
      });

      server.middlewares.use("/api/probe", async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
          const { handleProbe } = await server.ssrLoadModule("/server/probe-handler.ts");
          await handleProbe(req, res);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("probe handler crashed:", err);
          ndjsonError(res, err);
        }
      });

      server.middlewares.use("/api/deepgram-token", async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
          const { handleDeepgramToken } = await server.ssrLoadModule("/server/deepgram-token-handler.ts");
          await handleDeepgramToken(req, res);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("deepgram-token handler crashed:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), llgApi()],
});
