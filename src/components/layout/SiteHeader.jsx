import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { memberMenuGroups } from "../../data/site";
import { logoutAuth, useAuthPreview } from "../../hooks/useAuthPreview";
import { useDrawer } from "../../hooks/useDrawer";
import { BrandLink } from "../brand/Brand";
import SiteDrawer from "./SiteDrawer";

function MyPageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h11v4.5a3.5 3.5 0 0 1-3.5 3.5h-4A3.5 3.5 0 0 1 4 13.5V9Z" />
      <path d="M15 10h2.3a2.2 2.2 0 0 1 0 4.4H15" />
      <path d="M6 20h10" />
      <path d="M9 7.2c0-1 .7-1.4.7-2.3" />
      <path d="M12 7.2c0-1 .7-1.4.7-2.3" />
    </svg>
  );
}

function DesktopMemberMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const logout = () => {
    logoutAuth();
    setIsOpen(false);
  };

  return (
    <div className="header-account" ref={menuRef}>
      <button
        className="header-account-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        마이페이지
        <span aria-hidden="true">▾</span>
      </button>
      {isOpen ? (
        <div className="header-account-menu" role="menu">
          <Link role="menuitem" to="/subscriptions" onClick={() => setIsOpen(false)}>
            내 구독
          </Link>
          {memberMenuGroups.flatMap((group) =>
            group.items.map((item) => (
              <Link role="menuitem" to={item.to} key={item.to} onClick={() => setIsOpen(false)}>
                {item.label}
              </Link>
            )),
          )}
          <button role="menuitem" type="button" className="header-account-logout" onClick={logout}>
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function SiteHeader() {
  const drawer = useDrawer();
  const isAuthenticated = useAuthPreview();

  return (
    <>
      <header className="app-header">
        <BrandLink />
        <nav className="header-desktop-nav" aria-label="주요 메뉴">
          <Link to="/">홈</Link>
          <a href="/#content-catalog">콘텐츠</a>
          <Link to="/subscriptions">내 구독</Link>
          <Link to="/FAQ">FAQ</Link>
        </nav>

        <div className="header-desktop-actions">
          {isAuthenticated ? (
            <DesktopMemberMenu />
          ) : (
            <>
              <Link className="header-login-link" to="/login">
                로그인
              </Link>
              <Link className="header-signup-link" to="/signup">
                회원가입
              </Link>
            </>
          )}
        </div>

        <nav className="header-actions" aria-label="상단 메뉴">
          <Link className="mypage-icon" to="/mypage" aria-label="마이페이지">
            <MyPageIcon />
          </Link>
          <button className="menu" type="button" aria-label="메뉴 열기" aria-controls="site-menu" aria-expanded={drawer.isOpen} onClick={drawer.open}>
            <span />
            <span />
          </button>
        </nav>
      </header>
      <SiteDrawer isOpen={drawer.isOpen} isAuthenticated={isAuthenticated} onClose={drawer.close} />
    </>
  );
}
