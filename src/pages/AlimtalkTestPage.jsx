import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { renderTemplate, templateVariables } from "../../shared/alimtalk.js";
import "./alimtalk-test.css";

const APPROVAL = { REG: "등록", REQ: "심사 중", APR: "승인", REJ: "반려" };

export default function AlimtalkTestPage() {
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateCode, setTemplateCode] = useState("");
  const [variables, setVariables] = useState({});
  const [receiver, setReceiver] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [mode, setMode] = useState("test");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState(null);
  const [mid, setMid] = useState("");
  const [history, setHistory] = useState(null);
  const inFlight = useRef(false);
  const template = templates.find((item) => item.code === templateCode);
  const keys = templateVariables(template);
  const preview = template ? renderTemplate(template, variables) : null;
  const missingValues = keys.some((key) => !variables[key]?.trim());
  const ready = config?.ready && template?.available && !missingValues && receiver.trim();

  async function request(path, body) {
    const response = await fetch(`/api/alimtalk/${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${password.trim()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      const failure = new Error(data?.error || "서버 응답을 읽을 수 없습니다. 서버 실행 상태를 확인해 주세요.");
      failure.deliveryUnknown = data?.deliveryUnknown || (Boolean(body) && !data);
      throw failure;
    }
    return data;
  }

  async function run(action, work) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(action);
    setError("");
    try {
      await work();
    } catch (failure) {
      setError(failure.message || "요청을 처리하지 못했습니다.");
      if (failure.deliveryUnknown || (action === "send" && failure instanceof TypeError)) {
        setUncertain(true);
        setError("발송 응답을 확인하지 못했습니다. 알리고 전송 내역에서 접수 여부를 확인한 뒤 다시 시도해 주세요.");
      }
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  }

  function connect(event) {
    event.preventDefault();
    run("connect", async () => {
      setConfig(null);
      setTemplates([]);
      const nextConfig = await request("config");
      setConfig(nextConfig);
      if (!nextConfig.ready) return;
      const data = await request("templates");
      setTemplates(data.templates);
      setTemplateCode(data.templates.find((item) => item.available)?.code || "");
      setVariables({});
    });
  }

  function send(event) {
    event.preventDefault();
    if (!ready || uncertain) return;
    run("send", async () => {
      setResult(null);
      setHistory(null);
      setMid("");
      const data = await request("send", { templateCode, receiver, receiverName, variables, mode });
      setResult({ ...data, receiver, templateName: template.name });
      if (data.mode === "live") setMid(data.mid || "");
    });
  }

  function lookup(event) {
    event.preventDefault();
    run("history", async () => {
      setHistory(null);
      setHistory(await request(`history?mid=${encodeURIComponent(mid.trim())}`));
    });
  }

  return (
    <div className="alim-page">
      <header className="alim-topbar">
        <Link to="/" className="alim-brand">oh my piece<span>오마이피스</span></Link>
        <span className="alim-badge">알림톡 테스트</span>
      </header>

      <main className="alim-main">
        <div className="alim-intro">
          <span className="alim-eyebrow">KAKAO ALIMTALK</span>
          <h1>첫 알림톡을 보내볼까요?</h1>
          <p>승인된 템플릿을 선택하고, 테스트 수신자 한 명에게 보내보세요.</p>
        </div>

        <section className="alim-card alim-connect" aria-labelledby="alim-connect-title">
          <div>
            <h2 id="alim-connect-title"><span className="alim-step">1</span> 알리고 연결</h2>
            <p>테스트 접근 비밀번호로 등록된 템플릿을 불러옵니다.</p>
          </div>
          <form onSubmit={connect} className="alim-connect-form">
            <label className="alim-field">테스트 접근 비밀번호
              <input type="password" autoComplete="off" required value={password} disabled={Boolean(busy)}
                placeholder="서버에 설정한 테스트 비밀번호" onChange={(event) => {
                  setPassword(event.target.value); setConfig(null); setTemplates([]); setResult(null); setHistory(null);
                }} />
            </label>
            <button className="alim-button alim-button--dark" disabled={!password.trim() || Boolean(busy)}>
              {busy === "connect" ? "불러오는 중…" : "템플릿 불러오기"}
            </button>
          </form>
          {config?.ready && <p className="alim-connection-status">서버 설정 확인 · 등록 발신번호 {config.sender} · 템플릿 {templates.length}개</p>}
          {config && !config.ready && <p className="alim-alert" role="alert">서버 환경변수가 필요합니다: {config.missing.join(", ")}. 설정 후 서버를 다시 실행해 주세요.</p>}
          <details className="alim-help">
            <summary>처음 실행한다면</summary>
            <p><code>frontend/.env.example</code>을 참고해 <code>.env.local</code>에 알리고 API 키, 사용자 ID, 발신프로필 키, 등록 발신번호와 <code>ALIGO_TEST_TOKEN</code>을 설정해 주세요. 위 칸에는 <code>ALIGO_TEST_TOKEN</code> 값만 입력합니다.</p>
            <p>인증 정보는 서버에서 사용하며, 테스트 접근 비밀번호는 이 페이지를 닫으면 지워집니다.</p>
          </details>
        </section>

        {error && <div className="alim-alert" role="alert">{error}</div>}
        {uncertain && <div className="alim-uncertain">
          <p>접수 여부를 확인할 때까지 추가 발송을 잠시 막아두었어요.</p>
          <button type="button" className="alim-button" disabled={Boolean(busy)} onClick={() => { setUncertain(false); setError(""); }}>알리고 내역 확인 완료 · 새 테스트</button>
        </div>}

        <div className="alim-grid">
          <form onSubmit={send} className="alim-card alim-compose">
            <h2><span className="alim-step">2</span> 메시지 준비</h2>
            <fieldset disabled={!config?.ready || Boolean(busy)} className="alim-fields">
              <label className="alim-field">승인 템플릿
                <select required value={templateCode} onChange={(event) => { setTemplateCode(event.target.value); setVariables({}); }}>
                  <option value="">템플릿을 선택해 주세요</option>
                  {templates.map((item) => <option key={item.code} value={item.code} disabled={!item.available}>
                    {item.name} ({item.code}){!item.available ? ` · ${item.status === "S" ? "중단" : APPROVAL[item.approval] || "사용 불가"}` : ""}
                  </option>)}
                </select>
              </label>
              {config?.ready && !templates.some((item) => item.available) && <p className="alim-note">발송 가능한 승인 템플릿이 없습니다. 알리고의 템플릿 상태를 확인해 주세요.</p>}
              <div className="alim-recipient">
                <label className="alim-field">수신자 휴대전화 번호
                  <input type="tel" inputMode="tel" autoComplete="off" required maxLength={30} placeholder="010-1234-5678" value={receiver} onChange={(event) => setReceiver(event.target.value)} />
                </label>
                <label className="alim-field">수신자 이름 <span className="alim-optional">선택</span>
                  <input autoComplete="off" maxLength={100} placeholder="홍길동" value={receiverName} onChange={(event) => setReceiverName(event.target.value)} />
                </label>
              </div>
              <p className="alim-note">채널 가입자의 전화번호를 입력해 주세요. 가입자 목록은 자동으로 불러오지 않습니다.</p>
              {template && <div className="alim-variables">
                <h3>템플릿 변수 <span>{keys.length}개</span></h3>
                <p className="alim-note">본문과 버튼 링크의 변수만 바뀝니다. 승인된 문구와 줄바꿈은 유지해요.</p>
                {keys.length ? keys.map((key) => <label className="alim-field" key={key}>{key}
                  <input required maxLength={2000} autoComplete="off" placeholder={`#{${key}}에 들어갈 값`} value={variables[key] || ""}
                    onChange={(event) => setVariables((prev) => ({ ...prev, [key]: event.target.value }))} />
                </label>) : <p className="alim-note">이 템플릿은 추가로 입력할 변수가 없습니다.</p>}
              </div>}
              <div className="alim-mode">
                <h3>발송 모드</h3>
                <label className={mode === "test" ? "is-selected" : ""}>
                  <input type="radio" name="mode" value="test" checked={mode === "test"} onChange={() => setMode("test")} />
                  <span><strong>API 테스트</strong><small>요청 형식 확인 · 카카오톡이 전송되지 않아요</small></span>
                </label>
                <label className={mode === "live" ? "is-selected" : ""}>
                  <input type="radio" name="mode" value="live" checked={mode === "live"} onChange={() => setMode("live")} />
                  <span><strong>실제 발송</strong><small>입력한 번호로 1건 전송 · 알리고 잔액에서 차감</small></span>
                </label>
              </div>
              <button className="alim-button alim-button--send" disabled={!ready || Boolean(busy) || uncertain}>
                {busy === "send" ? "요청 처리 중…" : mode === "live" ? "알림톡 1건 실제 발송" : "API 테스트 실행"}
              </button>
              <p className="alim-note alim-center">전송 실패 시 SMS 대체 발송은 사용하지 않습니다.</p>
            </fieldset>
          </form>

          <aside className="alim-preview-column" aria-label="메시지 미리보기">
            <div className="alim-preview-heading"><h2>메시지 미리보기</h2><span>예상 화면</span></div>
            <div className="alim-phone">
              <div className="alim-chat-heading"><span className="alim-chat-icon" aria-hidden="true">●</span><div>등록된 카카오채널<small>알림톡 도착</small></div></div>
              <div className="alim-bubble">
                <div className="alim-bubble-label">알림톡</div>
                {preview ? <div className="alim-bubble-content">
                  {template.subtitle && <p className="alim-note">{template.subtitle}</p>}
                  {preview.title && <strong className="alim-emphasis">{preview.title}</strong>}
                  <p className="alim-message">{preview.content}</p>
                  {preview.buttons.map((button, index) => <div className="alim-preview-button" key={index}>{button.name}</div>)}
                </div> : <div className="alim-empty-preview"><span aria-hidden="true">✉</span><p>템플릿을 선택하면<br />보낼 메시지가 여기에 나타나요.</p></div>}
              </div>
              <p className="alim-preview-caption">실제 카카오톡 화면과 다를 수 있습니다.{template?.imageUrl ? " 템플릿 이미지는 이 미리보기에서 생략됩니다." : ""}</p>
            </div>
            {preview?.buttons.length > 0 && <details className="alim-help alim-link-details"><summary>버튼 링크 확인</summary>
              {preview.buttons.map((button, index) => <div key={index}><strong>{button.name}</strong>
                {["linkMo", "linkPc", "linkIos", "linkAnd"].filter((key) => button[key]).map((key) => <p key={key}>{key}: {button[key]}</p>)}
              </div>)}
            </details>}
            <p className="alim-note">API 테스트 성공은 실제 수신 완료를 뜻하지 않아요. 실제 발송 후 아래에서 결과를 조회해 주세요.</p>
          </aside>
        </div>

        <section className="alim-card alim-results" aria-labelledby="alim-result-title">
          <h2 id="alim-result-title"><span className="alim-step">3</span> 발송 결과 확인</h2>
          <div aria-live="polite">
            {result ? <div className="alim-result-receipt">
              <strong>{result.mode === "test" ? "API 테스트 요청 완료" : "실제 발송 요청 접수"}</strong>
              <p>{result.mode === "test" ? "테스트 모드로 요청했습니다. 수신자에게 카카오톡은 전송되지 않습니다." : "알리고에 요청이 접수되었습니다. 아래에서 실제 전달 결과를 확인해 주세요."}</p>
              <dl><div><dt>템플릿</dt><dd>{result.templateName}</dd></div><div><dt>수신자</dt><dd>{result.receiver}</dd></div>
                {result.mid && <div><dt>메시지 ID</dt><dd>{result.mid}</dd></div>}
                {result.accepted !== null && <div><dt>접수 건수</dt><dd>{result.accepted}</dd></div>}
              </dl>
              <p className="alim-note">알리고 응답: {result.message}</p>
            </div> : <p className="alim-note">발송 요청 결과와 메시지 ID가 이곳에 표시됩니다.</p>}
          </div>
          <form className="alim-history-form" onSubmit={lookup}>
            <label className="alim-field">메시지 ID
              <input inputMode="numeric" pattern="[0-9]{1,30}" required placeholder="실제 발송 응답의 mid" value={mid} disabled={!config?.ready || Boolean(busy)} onChange={(event) => setMid(event.target.value)} />
            </label>
            <button className="alim-button" disabled={!config?.ready || !mid.trim() || Boolean(busy)}>{busy === "history" ? "조회 중…" : "전달 결과 조회"}</button>
          </form>
          <p className="alim-note">결과 반영까지 시간이 걸릴 수 있어요. 발송 직후 목록이 비어 있거나 처리 중이면 잠시 후 다시 조회해 주세요.</p>
          {history && <div className="alim-history" aria-live="polite"><h3>메시지 {history.mid} 조회 결과</h3>
            {history.results.length ? history.results.map((item, index) => <article key={`${item.id}-${index}`}>
              <strong>{item.message || "처리 중 · 결과가 아직 도착하지 않았습니다."}</strong>
              <p>수신번호 {item.phone} · 결과 코드 {item.result || "대기"}</p>
              <small>요청 {item.requestedAt || "—"} · 결과 갱신 {item.reportedAt || "대기"}</small>
            </article>) : <p>아직 조회되는 전송 결과가 없습니다. 잠시 후 다시 조회해 주세요.</p>}
          </div>}
        </section>
        <footer className="alim-footer">오마이피스 알림톡 테스트 · <a href="https://smartsms.aligo.in/alimapi.html" target="_blank" rel="noreferrer">알리고 API 가이드 ↗</a></footer>
      </main>
    </div>
  );
}
