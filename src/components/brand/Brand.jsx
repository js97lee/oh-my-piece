import { Link } from "react-router-dom";

export function BrandLogo() {
  return (
    <svg className="brand-symbol" viewBox="0 0 24 24" aria-hidden="true">
      <path className="cake-mark" d="M11 7.4h2v2.5h6.6c.86 0 1.55.69 1.55 1.55v8.15c0 .86-.69 1.55-1.55 1.55H4.4c-.86 0-1.55-.69-1.55-1.55v-8.15c0-.86.69-1.55 1.55-1.55H11V7.4Z" />
      <path className="cake-mark" d="M12 1.7c1.52 1.38 2.35 2.58 2.35 3.82a2.35 2.35 0 1 1-4.7 0C9.65 4.28 10.48 3.08 12 1.7Z" />
      <path className="cake-window" d="M6 12.4h12v3.15c-1.18.53-2.14.39-3.16-.34-1.83-1.29-3.76-1.29-5.6.01-1.16.82-2.03.91-3.24.36V12.4Z" />
      <path className="cake-window" d="M6 17.82c1.41.31 2.71.03 4.04-.92 1.28-.9 2.04-.9 3.31 0 1.48 1.05 3.02 1.29 4.65.73v1.18H6v-.99Z" />
    </svg>
  );
}

export function BrandLink({ className = "", onClick }) {
  return (
    <Link className={`brand ${className}`.trim()} to="/" onClick={onClick} aria-label="오마이피스 홈">
      <BrandLogo />
      오마이피스
    </Link>
  );
}
