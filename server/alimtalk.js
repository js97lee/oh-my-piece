import { createHash, timingSafeEqual } from "node:crypto";
import { renderTemplate, templateVariables } from "../shared/alimtalk.js";

const API_BASE = "https://kakaoapi.aligo.in/akv10/";
const MAX_BODY = 16 * 1024;
const REQUIRED_ENV = ["ALIGO_API_KEY", "ALIGO_USER_ID", "ALIGO_SENDER_KEY", "ALIGO_SENDER_PHONE"];

class ApiError extends Error {
  constructor(status, message, code, deliveryUnknown = false) {
    super(message);
    Object.assign(this, { status, code, deliveryUnknown });
  }
}

function reply(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function authenticate(req, env) {
  if (!env.ALIGO_TEST_TOKEN?.trim()) {
    throw new ApiError(503, "서버에 ALIGO_TEST_TOKEN을 설정한 뒤 다시 실행해 주세요.", "NOT_CONFIGURED");
  }
  const expected = createHash("sha256").update(`Bearer ${env.ALIGO_TEST_TOKEN.trim()}`).digest();
  const actual = createHash("sha256").update(req.headers.authorization || "").digest();
  if (!timingSafeEqual(expected, actual)) {
    throw new ApiError(401, "테스트 접근 비밀번호가 올바르지 않습니다.", "UNAUTHORIZED");
  }
}

async function readBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) {
    throw new ApiError(415, "JSON 형식으로 요청해 주세요.", "INVALID_BODY");
  }
  let body = req.body;
  if (body === undefined) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY) throw new ApiError(413, "입력 내용이 너무 깁니다.", "BODY_TOO_LARGE");
      chunks.push(Buffer.from(chunk));
    }
    body = Buffer.concat(chunks).toString("utf8");
  }
  if (Buffer.byteLength(typeof body === "string" ? body : JSON.stringify(body)) > MAX_BODY) {
    throw new ApiError(413, "입력 내용이 너무 깁니다.", "BODY_TOO_LARGE");
  }
  try {
    if (typeof body === "string") body = JSON.parse(body);
  } catch {
    throw new ApiError(400, "요청 내용을 읽을 수 없습니다.", "INVALID_BODY");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "입력 내용을 확인해 주세요.", "INVALID_BODY");
  }
  return body;
}

function requiredText(value, label, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new ApiError(400, `${label}을(를) 확인해 주세요.`, "INVALID_INPUT");
  }
  return value.trim();
}

function normalizeTemplate(item) {
  if (typeof item.templtCode !== "string" || typeof item.templtContent !== "string") {
    throw new ApiError(502, "알리고 템플릿 응답 형식을 확인해 주세요.", "INVALID_RESPONSE");
  }
  // 조회 API의 linkMo/linkPc/linkIos/linkAnd 형식을 발송 API에도 그대로 사용합니다.
  const aliases = { linkMo: "linkM", linkPc: "linkP", linkIos: "linkI", linkAnd: "linkA" };
  const buttons = (Array.isArray(item.buttons) ? [...item.buttons] : [])
    .sort((a, b) => Number(a.ordering || 0) - Number(b.ordering || 0))
    .map((button) => Object.fromEntries(
      ["name", "linkType", "linkTypeName", "linkMo", "linkPc", "linkIos", "linkAnd"]
        .map((key) => [key, button[key] ?? button[aliases[key]]])
        .filter(([, value]) => typeof value === "string" && value !== ""),
    ));
  return {
    code: item.templtCode,
    name: item.templtName || item.templtCode,
    content: item.templtContent,
    title: item.templtTitle || "",
    subtitle: item.templtSubtitle || "",
    imageUrl: item.templtImageUrl || "",
    buttons,
    status: item.status,
    approval: item.inspStatus,
    available: item.inspStatus === "APR" && ["A", "R"].includes(item.status),
  };
}

export function createAlimtalkHandler({ getEnv = () => process.env, fetchImpl = fetch } = {}) {
  return async function handler(req, res) {
    let env = {};
    try {
      env = getEnv();
      const url = new URL(req.url, "http://localhost");
      const action = url.pathname.replace(/\/$/, "").split("/").at(-1);
      const method = { config: "GET", templates: "GET", send: "POST", history: "GET" }[action];
      if (!method) throw new ApiError(404, "존재하지 않는 API입니다.", "NOT_FOUND");
      if (req.method !== method) {
        res.setHeader("Allow", method);
        throw new ApiError(405, "지원하지 않는 요청 방식입니다.", "METHOD_NOT_ALLOWED");
      }
      authenticate(req, env);
      const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim());
      if (action === "config") {
        reply(res, 200, {
          ready: missing.length === 0,
          missing,
          sender: env.ALIGO_SENDER_PHONE?.replace(/\D/g, "").replace(/(\d{3,4})(\d{4})$/, "****$2") || "",
        });
        return;
      }
      if (missing.length) throw new ApiError(503, `서버 환경변수를 설정해 주세요: ${missing.join(", ")}`, "NOT_CONFIGURED");

      async function aligo(endpoint, params = {}) {
        const isSend = endpoint === "alimtalk/send/";
        let response;
        let payload;
        try {
          response = await fetchImpl(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: new URLSearchParams({
              apikey: env.ALIGO_API_KEY.trim(),
              userid: env.ALIGO_USER_ID.trim(),
              ...params,
            }),
            signal: AbortSignal.timeout(15000),
          });
          payload = await response.json();
        } catch {
          throw new ApiError(502, isSend
            ? "발송 응답을 확인하지 못했습니다. 중복 발송을 피하려면 알리고 전송 내역을 먼저 확인해 주세요."
            : "알리고 서버에 연결하지 못했습니다. 잠시 후 다시 조회해 주세요.", "UPSTREAM_UNAVAILABLE", isSend);
        }
        if (!response.ok || !payload || typeof payload !== "object" || !Object.hasOwn(payload, "code")) {
          throw new ApiError(502, "알리고 응답을 확인하지 못했습니다. 알리고 전송 내역을 확인해 주세요.", "INVALID_RESPONSE", isSend);
        }
        if (payload.code !== 0 && payload.code !== "0") {
          throw new ApiError(422, String(payload.message || "알리고 요청이 거절되었습니다."), payload.code);
        }
        return payload;
      }

      async function templates(code) {
        const payload = await aligo("template/list/", {
          senderkey: env.ALIGO_SENDER_KEY.trim(),
          ...(code ? { tpl_code: code } : {}),
        });
        if (!Array.isArray(payload.list)) throw new ApiError(502, "템플릿 목록을 읽을 수 없습니다.", "INVALID_RESPONSE");
        return payload.list.map(normalizeTemplate);
      }

      if (action === "templates") {
        reply(res, 200, { templates: await templates() });
      } else if (action === "history") {
        const mid = url.searchParams.get("mid");
        if (!/^\d{1,30}$/.test(mid || "")) throw new ApiError(400, "올바른 메시지 ID를 입력해 주세요.", "INVALID_INPUT");
        const payload = await aligo("history/detail/", { mid, page: "1", limit: "50" });
        if (!Array.isArray(payload.list)) throw new ApiError(502, "발송 결과를 읽을 수 없습니다.", "INVALID_RESPONSE");
        reply(res, 200, {
          mid,
          results: payload.list.map((item) => ({
            id: item.msgid,
            phone: item.phone,
            result: item.rslt,
            message: item.rslt_message,
            requestedAt: item.reqdate,
            sentAt: item.sentdate,
            reportedAt: item.reportdate,
          })),
        });
      } else if (action === "send") {
        const body = await readBody(req);
        const code = requiredText(body.templateCode, "템플릿");
        const phone = requiredText(body.receiver, "수신자 전화번호", 30).replace(/[\s()-]/g, "");
        if (!/^01[016789]\d{7,8}$/.test(phone)) throw new ApiError(400, "국내 휴대전화 번호를 입력해 주세요.", "INVALID_INPUT");
        if (!["test", "live"].includes(body.mode)) throw new ApiError(400, "발송 모드를 선택해 주세요.", "INVALID_INPUT");
        const receiverName = body.receiverName === undefined || body.receiverName === "" ? "" : requiredText(body.receiverName, "수신자 이름");
        const variables = body.variables;
        if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
          throw new ApiError(400, "템플릿 변수를 입력해 주세요.", "INVALID_INPUT");
        }
        const sender = env.ALIGO_SENDER_PHONE.replace(/[\s()-]/g, "");
        if (!/^\d{8,11}$/.test(sender)) throw new ApiError(503, "ALIGO_SENDER_PHONE의 등록 발신번호를 확인해 주세요.", "NOT_CONFIGURED");
        // 브라우저가 보낸 본문/버튼 대신, 승인된 최신 템플릿으로 서버에서 생성합니다.
        const template = (await templates(code)).find((item) => item.code === code);
        if (!template?.available) throw new ApiError(400, "승인된 발송 가능 템플릿을 선택해 주세요.", "INVALID_TEMPLATE");
        for (const key of templateVariables(template)) {
          if (!Object.hasOwn(variables, key)) throw new ApiError(400, `${key} 값을 입력해 주세요.`, "INVALID_INPUT");
          requiredText(variables[key], key, 2000);
          if (/#\{[^{}]+\}/.test(variables[key])) throw new ApiError(400, `${key}에 실제 값을 입력해 주세요.`, "INVALID_INPUT");
        }
        const rendered = renderTemplate(template, variables);
        const payload = await aligo("alimtalk/send/", {
          senderkey: env.ALIGO_SENDER_KEY.trim(),
          tpl_code: code,
          sender,
          receiver_1: phone,
          recvname_1: receiverName,
          subject_1: template.name,
          message_1: rendered.content,
          ...(rendered.title ? { emtitle_1: rendered.title } : {}),
          ...(rendered.buttons.length ? { button_1: JSON.stringify({ button: rendered.buttons }) } : {}),
          failover: "N",
          testMode: body.mode === "test" ? "Y" : "N",
        });
        if (Number(payload.info?.fcnt || 0) > 0) throw new ApiError(422, "알리고에서 수신번호 요청이 실패했습니다. 전송 내역을 확인해 주세요.", "RECIPIENT_REJECTED");
        reply(res, 200, {
          mode: body.mode,
          message: payload.message,
          mid: payload.info?.mid ? String(payload.info.mid) : null,
          accepted: payload.info?.scnt ?? null,
          cost: payload.info?.total ?? null,
        });
      }
    } catch (error) {
      // 공급자 오류 메시지에도 서버의 인증 정보가 포함되지 않도록 제거합니다.
      let message = error instanceof ApiError ? error.message : "요청 처리 중 오류가 발생했습니다.";
      for (const key of ["ALIGO_API_KEY", "ALIGO_SENDER_KEY", "ALIGO_TEST_TOKEN", "ALIGO_USER_ID"]) {
        if (env[key]?.trim()) message = message.split(env[key].trim()).join("[숨김]");
      }
      reply(res, error instanceof ApiError ? error.status : 500, {
        error: message,
        code: error instanceof ApiError ? error.code : "INTERNAL_ERROR",
        deliveryUnknown: error.deliveryUnknown || false,
      });
    }
  };
}
