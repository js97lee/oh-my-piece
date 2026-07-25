import { useState } from "react";
import { Link } from "react-router-dom";
import MobilePageShell from "../components/layout/MobilePageShell";
import { allContent, getContentBySlug } from "../data/content";

export function SubscriptionPage() {
  const content = getContentBySlug("daily-english-word");

  return (
    <MobilePageShell mainClassName="member-page">
      <header className="member-page-header">
        <h1>내 구독</h1>
        <p>구독 중인 콘텐츠와 발송 정보를 확인해요.</p>
      </header>
      <article className="subscription-card">
        <Link className="subscription-card-cover" to={`/contents/${content.slug}`}>
          <img src={content.image} alt="" />
        </Link>
        <div className="subscription-card-body">
          <div className="subscription-card-heading">
            <span>구독중</span>
            <small>2026.07.14부터</small>
          </div>
          <h2>{content.title}</h2>
          <dl>
            <div>
              <dt>발송 시간</dt>
              <dd>매일 오전 8:00</dd>
            </div>
            <div>
              <dt>구독 기간</dt>
              <dd>2026.07.14 – 2027.07.13</dd>
            </div>
          </dl>
          <Link className="subscription-manage-link" to={`/contents/${content.slug}`}>
            콘텐츠 상세보기
          </Link>
        </div>
      </article>
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
