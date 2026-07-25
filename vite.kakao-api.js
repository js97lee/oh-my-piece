import { loadEnv } from "vite";

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function kakaoTokenMiddleware(env) {
  return async (req, res, next) => {
    if (!req.url?.startsWith("/api/kakao/token")) {
      next();
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "method_not_allowed" });
      return;
    }

    const restApiKey = env.KAKAO_REST_API_KEY || env.VITE_KAKAO_REST_API_KEY;
    if (!restApiKey) {
      sendJson(res, 500, { error: "missing_kakao_rest_api_key" });
      return;
    }

    try {
      const { code, redirectUri } = await readBody(req);
      if (!code || !redirectUri) {
        sendJson(res, 400, { error: "invalid_request" });
        return;
      }

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: restApiKey,
        redirect_uri: redirectUri,
        code,
      });

      const response = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body,
      });

      const payload = await response.json();
      sendJson(res, response.status, payload);
    } catch (error) {
      sendJson(res, 500, {
        error: "token_exchange_failed",
        error_description: error.message,
      });
    }
  };
}

export function kakaoLocalApiPlugin() {
  return {
    name: "kakao-local-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      server.middlewares.use(kakaoTokenMiddleware(env));
    },
    configurePreviewServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "");
      server.middlewares.use(kakaoTokenMiddleware(env));
    },
  };
}
