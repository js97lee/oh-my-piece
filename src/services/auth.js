export async function authRequest(action, body) {
  let response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");
  }
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("인증 서버의 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    const error = new Error(data.error || "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    error.code = data.code;
    throw error;
  }
  if (["session", "login", "signup", "logout"].includes(action) && !Object.hasOwn(data, "user")) {
    throw new Error("로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  return data;
}

// Serialize cookie-changing requests within this tab, including React StrictMode initialization.
let pending = Promise.resolve();
export function sessionRequest(action, body) {
  const next = pending.then(() => authRequest(action, body));
  pending = next.catch(() => {});
  return next;
}
