import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

const QUICK_ACTIONS = [
  {
    id: "subscribe",
    label: "구독 문의",
    reply: "구독·콘텐츠 관련 문의는 FAQ에서 먼저 확인해 보세요. 필요하면 카카오톡 채널로도 안내해 드려요.",
  },
  {
    id: "payment",
    label: "결제·환불",
    reply: "결제·환불은 평일 10:00–18:00(점심 12:00–13:00 제외)에 카카오톡 채널 또는 이메일로 접수해 주세요.",
  },
  {
    id: "delivery",
    label: "발송 시간",
    reply: "구독 후 원하시는 요일·시간에 맞춰 카카오톡으로 매일 콘텐츠가 발송돼요.",
  },
];

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 4.5c-4.7 0-8.5 3.1-8.5 7 0 2.2 1.2 4.1 3.1 5.4-.1.9-.5 2.3-1.7 3.3 1.8-.1 3.3-.9 4.4-1.7.8.2 1.7.3 2.7.3 4.7 0 8.5-3.1 8.5-7s-3.8-7-8.5-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6.4 6.4a1 1 0 0 1 1.4 0L12 10.6l4.2-4.2a1 1 0 1 1 1.4 1.4L13.4 12l4.2 4.2a1 1 0 0 1-1.4 1.4L12 13.4l-4.2 4.2a1 1 0 0 1-1.4-1.4L10.6 12 6.4 7.8a1 1 0 0 1 0-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ChannelTalkWidget() {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      from: "agent",
      text: "안녕하세요, 오마이피스입니다.\n무엇을 도와드릴까요?",
    },
  ]);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    const onPointerDown = (event) => {
      const target = event.target;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  const handleQuickAction = (action) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${action.id}-${Date.now()}`, from: "user", text: action.label },
      { id: `agent-${action.id}-${Date.now()}`, from: "agent", text: action.reply },
    ]);
  };

  return createPortal(
    <div className="channel-talk">
      {isOpen ? (
        <section
          ref={panelRef}
          id={panelId}
          className="channel-talk-panel"
          aria-label="오마이피스 상담"
        >
          <header className="channel-talk-header">
            <div>
              <p className="channel-talk-brand">오마이피스</p>
              <p className="channel-talk-status">보통 몇 분 내 응답</p>
            </div>
            <button
              type="button"
              className="channel-talk-close"
              aria-label="상담창 닫기"
              onClick={() => setIsOpen(false)}
            >
              <CloseIcon />
            </button>
          </header>

          <div
            ref={bodyRef}
            className="channel-talk-body"
            role="log"
            aria-live="polite"
          >
            {messages.map((message) => (
              <p
                key={message.id}
                className={`channel-talk-bubble channel-talk-bubble--${message.from}`}
              >
                {message.text}
              </p>
            ))}
          </div>

          <div className="channel-talk-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="channel-talk-chip"
                onClick={() => handleQuickAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="channel-talk-footer">
            <Link to="/FAQ" className="channel-talk-link" onClick={() => setIsOpen(false)}>
              FAQ 보기
            </Link>
            <a
              className="channel-talk-link"
              href="mailto:studio.realday@gmail.com"
            >
              이메일 문의
            </a>
            <button
              type="button"
              className="channel-talk-link channel-talk-link--accent"
              onClick={() =>
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `kakao-${Date.now()}`,
                    from: "agent",
                    text: "카카오톡에서 ‘오마이피스’를 검색해 친구추가 해 주세요.\n평일 10:00–18:00에 상담해 드려요.",
                  },
                ])
              }
            >
              카카오톡 채널
            </button>
          </div>
        </section>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        className={`channel-talk-fab${isOpen ? " is-open" : ""}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={isOpen ? "상담창 닫기" : "상담 열기"}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>,
    document.body,
  );
}
