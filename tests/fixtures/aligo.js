// 외부 알리고 API를 호출하지 않는 검증용 데이터입니다.
export const testEnv = {
  ALIGO_API_KEY: "fixture-api-key",
  ALIGO_USER_ID: "fixture-user",
  ALIGO_SENDER_KEY: "fixture-sender-key",
  ALIGO_SENDER_PHONE: "02-1234-5678",
  ALIGO_TEST_TOKEN: "fixture-access-token",
};

export const approvedTemplate = {
  templtCode: "T_FIXTURE",
  templtName: "테스트용 학습 안내",
  templtContent: "#{고객명}님, 오늘의 학습이 준비되었어요.\r\n#{학습명}\r\n아래 버튼에서 확인해 주세요.",
  templtTitle: "#{학습명}",
  templtSubtitle: "오늘도 한 조각씩",
  status: "R",
  inspStatus: "APR",
  senderKey: testEnv.ALIGO_SENDER_KEY,
  buttons: [{ ordering: "1", name: "학습 시작하기", linkType: "WL", linkTypeName: "웹링크", linkMo: "https://example.com/#{학습경로}", linkPc: "https://example.com/#{학습경로}" }],
};

export function fixtureResponse(endpoint) {
  if (endpoint.endsWith("template/list/")) return { code: 0, message: "정상적으로 호출하였습니다.", list: [approvedTemplate] };
  if (endpoint.endsWith("alimtalk/send/")) return { code: 0, message: "검증용 모의 응답입니다.", info: { mid: "123456789", scnt: 1, fcnt: 0, total: 0 } };
  if (endpoint.endsWith("history/detail/")) return { code: 0, list: [{ msgid: "123456790", phone: "01000000000", rslt: "MOCK", rslt_message: "모의 전달 결과 · 실제로 발송하지 않았습니다.", reqdate: "2026-10-02 12:00:00", reportdate: "2026-10-02 12:00:01", senderKey: testEnv.ALIGO_SENDER_KEY }] };
  throw new Error(`알 수 없는 테스트 경로: ${endpoint}`);
}
