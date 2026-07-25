import ContentPricing from "./ContentPricing";
import DiscountBadge from "./DiscountBadge";

export default function ContentDetailView({ content }) {
  return (
    <>
      <figure className="detail-visual">
        <img src={content.image} alt={`${content.title} 대표 이미지`} />
        <DiscountBadge value={content.discount} tone={content.level} />
      </figure>
      <section className="detail-summary">
        <span className="detail-eyebrow">OH MY PIECE CONTENT</span>
        <h1>{content.title}</h1>
        <p>{content.detailDescription}</p>
        <ContentPricing content={content} variant="detail" />
      </section>
      <section className="detail-benefits">
        <h2>{content.detailHeading}</h2>
        <ul>
          {content.detailPoints.map((point) => (
            <li key={point.title}>
              <strong>{point.title}</strong>
              <span>{point.body}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="detail-routine">
        <h2>매일 10분, 이렇게 진행해요</h2>
        <ol>
          {content.lessonSteps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="detail-weekly-plan">
        <h2>한 주 커리큘럼</h2>
        <ul>
          {content.weeklyPlan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="detail-recommendations">
        <h2>이런 분께 추천해요</h2>
        <ul>
          {content.recommendedFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="detail-subscription-guide">
        <h2>구독 안내</h2>
        <dl>
          <div>
            <dt>발송 주기</dt>
            <dd>평일 매일, 선택한 시간</dd>
          </div>
          <div>
            <dt>학습 분량</dt>
            <dd>하루 약 10분</dd>
          </div>
          <div>
            <dt>구독 기간</dt>
            <dd>시작일부터 12개월</dd>
          </div>
          <div>
            <dt>이용 금액</dt>
            <dd>연 {content.totalPrice}</dd>
          </div>
        </dl>
        <p>카카오톡으로 학습 콘텐츠와 정답·해설 링크를 보내드려요. 발송 시간은 구독 신청 화면에서 선택할 수 있습니다.</p>
      </section>
    </>
  );
}
