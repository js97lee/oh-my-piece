import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import MobilePageShell from "../components/layout/MobilePageShell";
import { allContent, getContentBySlug } from "../data/content";
import {
  formatSubscriptionRange,
  getMySubscriptionBySlug,
  getMySubscriptionCards,
} from "../data/subscriptions";
import {
  getCurrentSubscriptionDay,
  getDailyLesson,
  getSubscriptionDayCount,
} from "../data/dailyLessons";

export function SubscriptionPage() {
  const subscriptions = getMySubscriptionCards();

  return (
    <MobilePageShell mainClassName="member-page subscription-list-page">
      <header className="member-page-header">
        <h1>내 구독</h1>
        <p>구독 중인 콘텐츠를 고르고, 카톡으로 받은 학습의 정답을 확인해요.</p>
      </header>

      {subscriptions.length === 0 ? (
        <section className="member-empty-state">
          <strong>구독 중인 콘텐츠가 없어요.</strong>
          <p>관심 있는 콘텐츠를 구독하면 이곳에서 매일 학습을 확인할 수 있어요.</p>
          <Link className="subscription-empty-link" to="/">
            콘텐츠 둘러보기
          </Link>
        </section>
      ) : (
        <section className="subscription-list" aria-label="구독 목록">
          <p className="subscription-list-count">구독중 {subscriptions.length}개</p>
          <ul>
            {subscriptions.map((item) => (
              <li key={item.id}>
                <Link className="subscription-list-card" to={`/subscriptions/${item.slug}`}>
                  <div className="subscription-list-cover">
                    <img src={item.content.image} alt="" />
                  </div>
                  <div className="subscription-list-body">
                    <div className="subscription-list-heading">
                      <span>구독중</span>
                      <small>{item.startDate.replaceAll("-", ".")}부터</small>
                    </div>
                    <h2>{item.content.title}</h2>
                    <p>{item.content.description}</p>
                    <div className="subscription-list-meta">
                      <span>{item.sendTime}</span>
                      <strong>
                        Day {item.todayDay}/{item.totalDays}
                      </strong>
                    </div>
                    <div className="subscription-list-progress" aria-hidden="true">
                      <div style={{ width: `${item.progressPercent}%` }} />
                    </div>
                    <span className="subscription-list-cta">학습 · 정답 보기</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MobilePageShell>
  );
}

export function SubscriptionDetailPage() {
  const { slug } = useParams();
  const subscription = getMySubscriptionBySlug(slug);
  const content = subscription ? getContentBySlug(subscription.slug) : null;

  if (!subscription || !content) {
    return <Navigate to="/subscriptions" replace />;
  }

  return <SubscriptionLearnView subscription={subscription} content={content} />;
}

function SubscriptionLearnView({ subscription, content }) {
  const totalDays = getSubscriptionDayCount();
  const todayDay = getCurrentSubscriptionDay(subscription.startDate);
  const [selectedDay, setSelectedDay] = useState(todayDay);
  const [answerOpen, setAnswerOpen] = useState(false);
  const dayStripRef = useRef(null);

  const lesson = useMemo(
    () => getDailyLesson(subscription.slug, selectedDay, subscription.startDate),
    [subscription.slug, subscription.startDate, selectedDay],
  );

  const isUnlocked = selectedDay <= todayDay;
  const isToday = selectedDay === todayDay;

  useEffect(() => {
    setSelectedDay(todayDay);
    setAnswerOpen(false);
  }, [subscription.slug, todayDay]);

  useEffect(() => {
    setAnswerOpen(false);
  }, [selectedDay]);

  useEffect(() => {
    const strip = dayStripRef.current;
    if (!strip) return;
    const active = strip.querySelector(`[data-day="${selectedDay}"]`);
    if (active) {
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [selectedDay]);

  const goDay = (day) => {
    if (day < 1 || day > totalDays) return;
    setSelectedDay(day);
  };

  return (
    <MobilePageShell mainClassName="member-page subscription-learn-page">
      <header className="member-page-header learn-detail-header">
        <Link className="learn-back-link" to="/subscriptions">
          ← 내 구독
        </Link>
        <h1>{content.title}</h1>
        <p>카카오톡으로 받은 학습, 여기서 정답과 해설을 확인해요.</p>
      </header>

      <article className="subscription-card subscription-card-compact">
        <div className="subscription-card-body">
          <div className="subscription-card-heading">
            <span>구독중</span>
            <small>{subscription.startDate.replaceAll("-", ".")}부터</small>
          </div>
          <dl>
            <div>
              <dt>발송 시간</dt>
              <dd>{subscription.sendTime}</dd>
            </div>
            <div>
              <dt>구독 기간</dt>
              <dd>{formatSubscriptionRange(subscription.startDate, subscription.endDate)}</dd>
            </div>
            <div>
              <dt>학습 진행</dt>
              <dd>
                Day {todayDay} / {totalDays}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      <section className="learn-progress" aria-label="학습 진행률">
        <div className="learn-progress-meta">
          <strong>1년 학습 캘린더</strong>
          <span>
            {todayDay}일차 · {Math.round((todayDay / totalDays) * 100)}%
          </span>
        </div>
        <div className="learn-progress-track" aria-hidden="true">
          <div className="learn-progress-fill" style={{ width: `${(todayDay / totalDays) * 100}%` }} />
        </div>
      </section>

      <section className="learn-day-panel" aria-label="일차 선택">
        <div className="learn-day-nav">
          <button type="button" onClick={() => goDay(selectedDay - 1)} disabled={selectedDay <= 1}>
            이전
          </button>
          <div className="learn-day-current">
            <strong>Day {selectedDay}</strong>
            <small>{lesson.dateLabel}</small>
          </div>
          <button type="button" onClick={() => goDay(selectedDay + 1)} disabled={selectedDay >= totalDays}>
            다음
          </button>
        </div>

        <div className="learn-day-strip" ref={dayStripRef}>
          {Array.from({ length: totalDays }, (_, index) => {
            const day = index + 1;
            const unlocked = day <= todayDay;
            const active = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                data-day={day}
                className={[
                  "learn-day-chip",
                  active ? "is-active" : "",
                  unlocked ? "is-unlocked" : "is-locked",
                  day === todayDay ? "is-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => goDay(day)}
                aria-label={`${day}일차${!unlocked ? " (잠김)" : ""}`}
                aria-current={active ? "true" : undefined}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p className="learn-day-hint">열려 있는 날만 정답을 볼 수 있어요. 회색은 아직 발송 전입니다.</p>
      </section>

      <section className="learn-message" aria-live="polite">
        <header className="learn-message-head">
          <span className="learn-message-badge">{isToday ? "오늘 발송" : isUnlocked ? "지난 학습" : "예정"}</span>
          <h2>
            Day {lesson.day} · {content.title}
          </h2>
          <p>{lesson.dateLabel}</p>
        </header>

        {!isUnlocked ? (
          <div className="learn-locked">
            <strong>아직 발송 전이에요</strong>
            <p>구독 시작일부터 {selectedDay}일차에 카카오톡으로 도착합니다. 그날부터 정답을 확인할 수 있어요.</p>
          </div>
        ) : (
          <>
            <article className="learn-kakao-bubble">
              <p className="learn-kakao-label">카카오톡 메시지</p>
              <pre>{lesson.kakaoPreview}</pre>
            </article>

            <article className="learn-prompt">
              <h3>{lesson.promptTitle}</h3>
              <p>{lesson.promptBody}</p>
              {lesson.items?.length > 0 ? (
                <ul className="learn-prompt-items">
                  {lesson.items.map((item) => (
                    <li key={`${item.label}-${item.body}`}>
                      <strong>{item.label}</strong>
                      <span>{item.body}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="learn-question">{lesson.question}</p>
            </article>

            <div className="learn-answer-block">
              {!answerOpen ? (
                <button className="learn-answer-toggle" type="button" onClick={() => setAnswerOpen(true)}>
                  정답 · 해설 보기
                </button>
              ) : (
                <div className="learn-answer-panel">
                  <div className="learn-answer-panel-head">
                    <strong>정답</strong>
                    <button type="button" onClick={() => setAnswerOpen(false)}>
                      가리기
                    </button>
                  </div>
                  <p className="learn-answer-value">{lesson.answer}</p>
                  <div className="learn-explanation">
                    <strong>해설</strong>
                    <pre>{lesson.explanation}</pre>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </MobilePageShell>
  );
}

export function MemberUtilityPage({ title, description }) {
  return (
    <MobilePageShell mainClassName="member-page">
      <header className="member-page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <section className="member-empty-state">
        <strong>아직 표시할 내역이 없어요.</strong>
        <p>오마이피스를 이용하면 이곳에서 한눈에 확인할 수 있습니다.</p>
      </section>
    </MobilePageShell>
  );
}

export function GiftPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitGift = (event) => {
    event.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <MobilePageShell mainClassName="member-page">
      <header className="member-page-header">
        <h1>콘텐츠 선물하기</h1>
        <p>매일 쌓이는 지식 루틴을 소중한 사람에게 선물해 보세요.</p>
      </header>
      {isSubmitted ? (
        <section className="gift-complete">
          <span aria-hidden="true">✓</span>
          <h2>선물 준비가 완료됐어요</h2>
          <p>현재는 UI 미리보기 단계이며 실제 결제나 발송은 진행되지 않습니다.</p>
          <button type="button" onClick={() => setIsSubmitted(false)}>
            다른 선물 고르기
          </button>
        </section>
      ) : (
        <form className="gift-form" onSubmit={submitGift}>
          <fieldset>
            <legend>선물할 콘텐츠</legend>
            <div className="gift-content-list">
              {allContent.map((content, index) => (
                <label className="gift-content-option" key={content.slug}>
                  <input type="radio" name="gift-content" value={content.slug} defaultChecked={index === 0} />
                  <img src={content.image} alt="" />
                  <span>
                    <strong>{content.title}</strong>
                    <small>{content.totalPrice}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="gift-field">
            받는 분 휴대폰 번호
            <input type="tel" placeholder="010-0000-0000" required />
          </label>
          <label className="gift-field">
            선물 메시지
            <textarea rows="3" placeholder="함께 나누고 싶은 메시지를 적어주세요." />
          </label>
          <button className="gift-submit" type="submit">
            선물 결제하기
          </button>
          <p className="gift-preview-notice">현재는 화면 흐름을 확인하기 위한 UI 미리보기입니다.</p>
        </form>
      )}
    </MobilePageShell>
  );
}

export function GiftHistoryPage({ type }) {
  const isSent = type === "sent";

  return (
    <MobilePageShell mainClassName="member-page">
      <header className="member-page-header">
        <h1>{isSent ? "보낸 선물" : "받은 선물"}</h1>
        <p>{isSent ? "내가 보낸 콘텐츠 선물과 상태를 확인해요." : "친구에게 받은 콘텐츠 선물을 확인해요."}</p>
      </header>
      <section className="member-empty-state">
        <strong>{isSent ? "아직 보낸 선물이 없어요." : "아직 받은 선물이 없어요."}</strong>
        <p>콘텐츠를 선물하면 이곳에 선물 내역이 표시됩니다.</p>
      </section>
    </MobilePageShell>
  );
}
