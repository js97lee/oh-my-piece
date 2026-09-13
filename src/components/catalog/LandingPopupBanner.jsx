import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import popupBannerImage from "../../../assets/popup-banner.jpg";

const DISMISS_KEY = "oh_my_piece_landing_popup_dismissed_date";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function LandingPopupBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === todayKey()) {
        return undefined;
      }
    } catch {
      // ignore storage errors
    }

    const timer = window.setTimeout(() => setIsOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const closePopup = () => {
    setIsOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, todayKey());
    } catch {
      // ignore storage errors
    }
  };

  if (!isOpen) return null;

  return (
    <div className="landing-popup" role="dialog" aria-modal="true" aria-label="프로모션 안내">
      <button className="landing-popup-backdrop" type="button" aria-label="팝업 닫기" onClick={closePopup} />
      <div className="landing-popup-panel">
        <button className="landing-popup-close" type="button" aria-label="닫기" onClick={closePopup}>
          ×
        </button>
        <Link className="landing-popup-media" to="/#content-catalog" onClick={closePopup}>
          <img src={popupBannerImage} alt="오마이피스 첫 달 특별 혜택 안내" />
        </Link>
        <div className="landing-popup-actions">
          <Link className="landing-popup-cta" to="/#content-catalog" onClick={closePopup}>
            콘텐츠 보러가기
          </Link>
          <button className="landing-popup-dismiss" type="button" onClick={closePopup}>
            오늘 하루 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
