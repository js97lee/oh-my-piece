import { Link } from "react-router-dom";
import { footerSections } from "../../data/site";
import { BrandLink } from "../brand/Brand";

function FooterSection({ section }) {
  return (
    <details open={section.open || undefined}>
      <summary>{section.title}</summary>
      <div className="details-content">
        {section.links?.map((link) => (
          <Link to={link.to} key={link.to}>
            {link.label}
          </Link>
        ))}
        {section.lines?.map((line) => (
          <p className="footer-line" key={line}>
            {line}
          </p>
        ))}
      </div>
    </details>
  );
}

export default function SiteFooter() {
  return (
    <footer className="footer">
      <BrandLink className="footer-brand" />
      <p>매일 아침, 당신의 성장을 위한 한 입</p>
      {footerSections.map((section) => (
        <FooterSection section={section} key={section.title} />
      ))}
      <p className="footer-copyright">© 2026 오마이피스. All rights reserved.</p>
    </footer>
  );
}
