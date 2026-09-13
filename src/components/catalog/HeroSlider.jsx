import { useAutoSlider } from "../../hooks/useAutoSlider";

function Chevron({ direction }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {direction === "prev" ? (
        <path d="M14.5 5.5 8 12l6.5 6.5" />
      ) : (
        <path d="M9.5 5.5 16 12l-6.5 6.5" />
      )}
    </svg>
  );
}

export default function HeroSlider({ banners }) {
  const [activeIndex, setActiveIndex] = useAutoSlider(banners.length, 4500);
  const total = banners.length;

  const goTo = (index) => {
    if (total <= 0) return;
    setActiveIndex((index + total) % total);
  };

  return (
    <section className="hero">
      <div className="hero-stage" aria-label="상단 배너">
        <div className="hero-frame">
          <div className="hero-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
            {banners.map((banner) => (
              <figure className="hero-slide" key={banner.src}>
                <img className="hero-banner-image" src={banner.src} alt={banner.alt} />
              </figure>
            ))}
          </div>

          {total > 1 ? (
            <>
              <button
                className="hero-arrow hero-arrow--prev"
                type="button"
                aria-label="이전 배너"
                onClick={() => goTo(activeIndex - 1)}
              >
                <Chevron direction="prev" />
              </button>
              <button
                className="hero-arrow hero-arrow--next"
                type="button"
                aria-label="다음 배너"
                onClick={() => goTo(activeIndex + 1)}
              >
                <Chevron direction="next" />
              </button>
            </>
          ) : null}
        </div>

        {total > 1 ? (
          <div className="hero-dots" role="tablist" aria-label="배너 선택">
            {banners.map((banner, index) => (
              <button
                key={`${banner.src}-dot`}
                type="button"
                role="tab"
                className={`hero-dot${activeIndex === index ? " is-active" : ""}`}
                aria-label={`${index + 1}번 배너`}
                aria-selected={activeIndex === index}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
