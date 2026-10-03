import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createAlimtalkHandler } from "../server/alimtalk.js";
import { approvedTemplate, fixtureResponse, testEnv } from "./fixtures/aligo.js";

const validSend = {
  templateCode: "T_FIXTURE",
  receiver: "010-0000-0000",
  receiverName: "테스트",
  variables: { 고객명: "홍길동", 학습명: "영어 한 조각", 학습경로: "lessons/one" },
  mode: "test",
};

async function setup(t, { env = testEnv, respond = fixtureResponse } = {}) {
  const calls = [];
  const handler = createAlimtalkHandler({
    getEnv: () => env,
    fetchImpl: async (url, options) => {
      const params = Object.fromEntries(options.body);
      calls.push({ url, params, headers: options.headers });
      return new Response(JSON.stringify(await respond(url, params)), { headers: { "Content-Type": "application/json" } });
    },
  });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  async function request(action, body, { token = testEnv.ALIGO_TEST_TOKEN, method = body === undefined ? "GET" : "POST", raw } = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/alimtalk/${action}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  }
  return { calls, request };
}

test("인증하지 않은 요청은 발송과 조회 모두 차단한다", async (t) => {
  const { request, calls } = await setup(t);
  for (const [action, body] of [["send", validSend], ["templates"], ["history?mid=1"]]) {
    assert.equal((await request(action, body, { token: "wrong" })).status, 401);
  }
  assert.equal(calls.length, 0);
});

test("접근 비밀번호를 설정하지 않으면 API를 열지 않는다", async (t) => {
  const { request, calls } = await setup(t, { env: { ...testEnv, ALIGO_TEST_TOKEN: "" } });
  assert.equal((await request("config")).status, 503);
  assert.equal(calls.length, 0);
});

test("환경변수 누락을 안내하고 인증 정보는 반환하지 않는다", async (t) => {
  const { request } = await setup(t, { env: { ...testEnv, ALIGO_API_KEY: "" } });
  const result = await request("config");
  assert.deepEqual(result.data.missing, ["ALIGO_API_KEY"]);
  assert.equal(result.data.ready, false);
  assert.equal(result.data.sender, "02****5678");
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal((await request("send", validSend)).status, 503);
});

test("승인 상태를 구분하고 템플릿 응답에서 발신프로필 키를 제외한다", async (t) => {
  const { request } = await setup(t, { respond: () => ({ code: "0", list: [approvedTemplate, { ...approvedTemplate, templtCode: "SUSPENDED", status: "S" }, { ...approvedTemplate, templtCode: "PENDING", inspStatus: "REQ" }] }) });
  const { data } = await request("templates");
  assert.deepEqual(data.templates.map((item) => item.available), [true, false, false]);
  assert.equal(JSON.stringify(data).includes(testEnv.ALIGO_SENDER_KEY), false);
});

test("테스트 발송은 승인 원문의 개행과 버튼을 유지하고 서버 인증으로 form 전송한다", async (t) => {
  const { request, calls } = await setup(t);
  const { status, data } = await request("send", { ...validSend, sender: "arbitrary", message: "임의 내용", failover: "Y", variables: { ...validSend.variables, 고객명: "$&" } });
  assert.equal(status, 200);
  assert.equal(data.mode, "test");
  assert.equal(data.mid, "123456789");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].params.tpl_code, "T_FIXTURE");
  const { params, headers } = calls[1];
  assert.equal(params.apikey, testEnv.ALIGO_API_KEY);
  assert.equal(params.userid, testEnv.ALIGO_USER_ID);
  assert.equal(params.senderkey, testEnv.ALIGO_SENDER_KEY);
  assert.equal(params.sender, "0212345678");
  assert.equal(params.receiver_1, "01000000000");
  assert.equal(params.testMode, "Y");
  assert.equal(params.failover, "N");
  assert.equal(params.subject_1, approvedTemplate.templtName);
  assert.equal(params.message_1, "$&님, 오늘의 학습이 준비되었어요.\r\n영어 한 조각\r\n아래 버튼에서 확인해 주세요.");
  assert.equal(params.emtitle_1, "영어 한 조각");
  assert.equal(JSON.parse(params.button_1).button[0].linkMo, "https://example.com/lessons/one");
  assert.match(headers["Content-Type"], /application\/x-www-form-urlencoded/);
  assert.equal("receiver_2" in params, false);
  for (const key of ["ALIGO_API_KEY", "ALIGO_TEST_TOKEN", "ALIGO_SENDER_KEY"]) assert.equal(JSON.stringify(data).includes(testEnv[key]), false);
});

test("실제 발송 선택일 때만 testMode=N을 전송한다 (외부 API는 모의 응답)", async (t) => {
  const { request, calls } = await setup(t);
  assert.equal((await request("send", { ...validSend, mode: "live" })).status, 200);
  assert.equal(calls[1].params.testMode, "N");
});

test("잘못된 수신번호/모드/본문은 알리고 호출 전 거절한다", async (t) => {
  const { request, calls } = await setup(t);
  for (const body of [null, [], { ...validSend, receiver: "01000000000,01011111111" }, { ...validSend, mode: "N" }, { ...validSend, mode: null }, { ...validSend, variables: [] }]) {
    assert.equal((await request("send", body)).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await request("send", {}, { raw: "invalid json" })).status, 400);
  assert.equal((await request("send", { ...validSend, extra: "x".repeat(17000) })).status, 413);
});

test("승인되지 않았거나 중단된 템플릿으로는 발송하지 않는다", async (t) => {
  for (const template of [{ ...approvedTemplate, inspStatus: "REQ" }, { ...approvedTemplate, status: "S" }]) {
    const { request, calls } = await setup(t, { respond: () => ({ code: 0, list: [template] }) });
    assert.equal((await request("send", validSend)).status, 400);
    assert.equal(calls.length, 1);
  }
});

test("누락된 변수와 치환되지 않은 변수 표현은 발송하지 않는다", async (t) => {
  const { request, calls } = await setup(t);
  for (const variables of [{}, { ...validSend.variables, 학습경로: "  " }, { ...validSend.variables, 고객명: "#{다른변수}" }]) {
    assert.equal((await request("send", { ...validSend, variables })).status, 400);
  }
  assert.equal(calls.some((call) => call.url.endsWith("alimtalk/send/")), false);
});

test("변수와 버튼 없는 템플릿은 불필요한 button_1 없이 전송한다", async (t) => {
  const { request, calls } = await setup(t, { respond: (url) => url.endsWith("template/list/") ? { code: 0, list: [{ ...approvedTemplate, templtContent: "가입을 환영합니다.", templtTitle: "", buttons: [] }] } : fixtureResponse(url) });
  assert.equal((await request("send", { ...validSend, variables: {} })).status, 200);
  assert.equal("button_1" in calls[1].params, false);
  assert.equal("emtitle_1" in calls[1].params, false);
});

test("HTTP 200이어도 알리고 code가 실패이면 성공으로 표시하지 않는다", async (t) => {
  const { request } = await setup(t, { respond: () => ({ code: -99, message: `인증 오류 ${testEnv.ALIGO_API_KEY}` }) });
  const { status, data } = await request("templates");
  assert.equal(status, 422);
  assert.equal(data.code, -99);
  assert.equal(data.error.includes(testEnv.ALIGO_API_KEY), false);
});

test("발송 도중 연결 실패는 자동 재시도 없이 접수 여부 불명으로 반환한다", async (t) => {
  const { request, calls } = await setup(t, { respond: (url) => {
    if (url.endsWith("alimtalk/send/")) throw new Error("network failed");
    return fixtureResponse(url);
  } });
  const { status, data } = await request("send", validSend);
  assert.equal(status, 502);
  assert.equal(data.deliveryUnknown, true);
  assert.equal(calls.length, 2);
});

test("성공 code가 없는 응답을 성공 처리하지 않는다", async (t) => {
  const { request } = await setup(t, { respond: () => ({ message: "invalid" }) });
  const { status, data } = await request("templates");
  assert.equal(status, 502);
  assert.equal(data.deliveryUnknown, false);
});

test("수신번호 거절 건수를 성공 접수로 표시하지 않는다", async (t) => {
  const { request } = await setup(t, { respond: (url) => url.endsWith("alimtalk/send/") ? { code: 0, info: { scnt: 0, fcnt: 1 } } : fixtureResponse(url) });
  assert.equal((await request("send", validSend)).status, 422);
});

test("결과 조회는 API 접수와 구분해 공급자 결과 코드/사유를 반환한다", async (t) => {
  const { request, calls } = await setup(t);
  const { data } = await request("history?mid=123456789");
  assert.equal(data.results[0].result, "MOCK");
  assert.match(data.results[0].message, /모의 전달 결과/);
  assert.equal(JSON.stringify(data).includes(testEnv.ALIGO_SENDER_KEY), false);
  assert.equal(calls[0].params.mid, "123456789");
  assert.equal(calls[0].params.limit, "50");
  assert.equal((await request("history?mid=abc")).status, 400);
});

test("잘못된 메서드는 발송되지 않는다", async (t) => {
  const { request, calls } = await setup(t);
  assert.equal((await request("send")).status, 405);
  assert.equal((await request("other")).status, 404);
  assert.equal(calls.length, 0);
});
