import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = createServer(app);

  app.use(express.json());

  // Log in-memory status
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Full-Stack MQTT Proxy Server Active" });
  });

  // WebSocket Server for proxying
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (clientWs, req) => {
    let remoteWs: WebSocket | null = null;
    try {
      const urlParams = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const targetUrl = urlParams.searchParams.get("target");

      if (!targetUrl) {
        console.error("[Proxy] Connection rejected: Missing 'target' query parameter");
        clientWs.close(1011, "Missing target query parameter");
        return;
      }

      console.log(`[Proxy] Connecting to remote broker: ${targetUrl}`);

      // Extract and forward any registered subprotocol (standard MQTT is "mqtt")
      const subprotocol = req.headers["sec-websocket-protocol"] || "mqtt";

      remoteWs = new WebSocket(targetUrl, subprotocol, {
        rejectUnauthorized: false // Avoid issues with self-signed SSL or unvouched certificates
      });

      // Forward client message to the destination MQTT broker
      clientWs.on("message", (data, isBinary) => {
        if (remoteWs && remoteWs.readyState === WebSocket.OPEN) {
          remoteWs.send(data, { binary: isBinary });
        }
      });

      // Forward destination MQTT broker message to the browser client
      remoteWs.on("message", (data, isBinary) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data, { binary: isBinary });
        }
      });

      // Close handlers
      clientWs.on("close", (code, reason) => {
        console.log(`[Proxy] Client browser closed the connection (code: ${code})`);
        if (remoteWs) {
          remoteWs.close(1000);
        }
      });

      remoteWs.on("close", (code, reason) => {
        console.log(`[Proxy] Remote MQTT broker closed the connection (code: ${code})`);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close(1000);
        }
      });

      // error handlers
      clientWs.on("error", (err) => {
        console.error("[Proxy] Client browser connection error:", err);
        if (remoteWs) remoteWs.close();
      });

      remoteWs.on("error", (err) => {
        console.error("[Proxy] Remote broker connection error:", err);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close();
        }
      });

    } catch (e) {
      console.error("[Proxy] Error routing WebSocket connection:", e);
      clientWs.close(1011, "Internal server proxy error");
    }
  });

  // Handle server upgrade event
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);

    if (pathname === "/api/proxy") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      // Allow other protocols or reject
      if (process.env.NODE_ENV !== "production") {
        // In development, let Vite handle its HMR upgrades
        // Our endpoint /api/proxy will check above, other upgrades will fall through to Vite middleware
      } else {
        socket.destroy();
      }
    }
  });

  // Vite development middleware vs production static handler
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
