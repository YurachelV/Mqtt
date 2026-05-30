import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import net from "net";
import tls from "tls";

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
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => {
      const list = Array.from(protocols);
      if (list.includes("mqtt")) return "mqtt";
      return list[0] || "";
    }
  });

  wss.on("connection", (clientWs, req) => {
    let remoteWs: WebSocket | null = null;
    let tcpSocket: net.Socket | null = null;

    try {
      const urlParams = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const targetUrl = urlParams.searchParams.get("target");

      if (!targetUrl) {
        console.error("[Proxy] Connection rejected: Missing 'target' query parameter");
        clientWs.close(1011, "Missing target query parameter");
        return;
      }

      console.log(`[Proxy] Routing connection to: ${targetUrl}`);

      if (targetUrl.startsWith("tcp://") || targetUrl.startsWith("tcps://")) {
        // Raw TCP or TLS socket proxying
        const parsedUrl = new URL(targetUrl);
        const isSecure = parsedUrl.protocol === "tcps:";
        const targetHost = parsedUrl.hostname;
        const targetPort = parseInt(parsedUrl.port) || (isSecure ? 8883 : 1883);

        console.log(`[Proxy] Opening raw ${isSecure ? "TLS" : "TCP"} socket connection to ${targetHost}:${targetPort}`);

        if (isSecure) {
          tcpSocket = tls.connect(targetPort, targetHost, { rejectUnauthorized: false }, () => {
            console.log(`[Proxy] Raw TLS socket connected to ${targetHost}:${targetPort}`);
          });
        } else {
          tcpSocket = net.createConnection(targetPort, targetHost, () => {
            console.log(`[Proxy] Raw TCP socket connected to ${targetHost}:${targetPort}`);
          });
        }

        // Bridge: Forward browser WebSocket message to the TCP/TLS socket
        clientWs.on("message", (data, isBinary) => {
          if (tcpSocket && !tcpSocket.destroyed) {
            tcpSocket.write(data as any);
          }
        });

        // Bridge: Forward raw socket data to browser WebSocket
        tcpSocket.on("data", (chunk) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(chunk, { binary: true });
          }
        });

        // Close handlers
        clientWs.on("close", (code, reason) => {
          console.log(`[Proxy] Client browser closed WebSocket (code: ${code})`);
          if (tcpSocket) tcpSocket.destroy();
        });

        tcpSocket.on("close", () => {
          console.log(`[Proxy] Raw remote socket closed connection`);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1000);
          }
        });

        // Error handlers
        clientWs.on("error", (err) => {
          console.error("[Proxy] Client browser connection error:", err);
          if (tcpSocket) tcpSocket.destroy();
        });

        tcpSocket.on("error", (err) => {
          console.error("[Proxy] Raw socket connection error:", err.message);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        });

      } else {
        // Standard WebSockets proxying
        console.log(`[Proxy] Connecting to remote WebSocket broker: ${targetUrl}`);

        // Extract and forward any registered subprotocol (standard MQTT is "mqtt")
        const rawProtocols = req.headers["sec-websocket-protocol"];
        const subprotocols = rawProtocols
          ? rawProtocols.split(",").map(p => p.trim())
          : ["mqtt"];

        remoteWs = new WebSocket(targetUrl, subprotocols, {
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
          console.error("[Proxy] Remote WebSocket broker connection error:", err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        });
      }

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
