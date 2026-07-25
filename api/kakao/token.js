export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_REST_API_KEY;
  if (!restApiKey) {
    res.status(500).json({ error: "missing_kakao_rest_api_key" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { code, redirectUri } = body;

    if (!code || !redirectUri) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: restApiKey,
      redirect_uri: redirectUri,
      code,
    });

    const clientSecret = process.env.KAKAO_CLIENT_SECRET;
    if (clientSecret) {
      tokenBody.set("client_secret", clientSecret);
    }

    const response = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: tokenBody,
    });

    const payload = await response.json();
    res.status(response.status).json(payload);
  } catch (error) {
    res.status(500).json({
      error: "token_exchange_failed",
      error_description: error.message,
    });
  }
}
