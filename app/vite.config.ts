import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev-only plugin that mounts the brief generator endpoint.
 * Production deploys should expose handleBrief() via a serverless function
 * or a small Express/Hono server — the contract is identical.
 */
function briefApi(): PluginOption {
  return {
    name: "llg:brief-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/brief", async (req, res, next) => {
        if (req.method !== "POST") return next();
        try {
          const { handleBrief } = await server.ssrLoadModule("/server/handler.ts");
          await handleBrief(req, res);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("brief handler crashed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/x-ndjson");
          }
          res.write(
            JSON.stringify({
              type: "error",
              message: err instanceof Error ? err.message : String(err),
            }) + "\n"
          );
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), briefApi()],
});
