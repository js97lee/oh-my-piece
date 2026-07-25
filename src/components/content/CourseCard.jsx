import { Link } from "react-router-dom";
import ContentPricing from "./ContentPricing";
import DiscountBadge from "./DiscountBadge";

export default function CourseCard({ content }) {
  const titleLines = (content.coverTitle || content.title).split("\n");

  return (
    <article className="course-card reveal-on-scroll">
      <Link className="course-card-link" to={`/contents/${content.slug}`} aria-label={`${content.title} 상세보기`}>
        <div className="course-cover">
          <img src={content.image} alt="" loading="lazy" />
          <DiscountBadge value={content.discount} tone={content.level} />
          <strong>
            {titleLines.map((line, index) => (
              <span className={index === 0 ? "cover-title-light" : undefined} key={line}>
                {line}
              </span>
            ))}
          </strong>
        </div>
        <div className="course-body">
          <p className="course-description">{content.subtitle || content.description}</p>
          <ContentPricing content={content} />
        </div>
      </Link>
    </article>
  );
}
