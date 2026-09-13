import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { memberMenuGroups } from "../../data/site";
import { useCartCount } from "../../hooks/useCartCount";
import { logoutAuth, useAuthPreview } from "../../hooks/useAuthPreview";
import { useDrawer } from "../../hooks/useDrawer";
import { BrandLink } from "../brand/Brand";
import SiteDrawer from "./SiteDrawer";

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h14l-1.4 8.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.7L5.2 4H3" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5 21 21" />
    </svg>
  );
}

function MemberMenu() {
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

function HeaderSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();
    const next = query.trim();
    if (!next) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <form className="header-search" role="search" onSubmit={onSubmit}>
      <SearchIcon />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="콘텐츠 검색"
        aria-label="콘텐츠 검색"
      />
    </form>
  );
}

export default function SiteHeader() {
  const drawer = useDrawer();
  const isAuthenticated = useAuthPreview();
  const cartCount = useCartCount();

  return (
    <>
      <header className="app-header">
        <BrandLink />
        <nav className="header-desktop-nav" aria-label="주요 메뉴">
          <a href="/#content-catalog">콘텐츠</a>
          <Link to="/subscriptions">내 구독</Link>
          <Link to="/events">이벤트</Link>
          <Link to="/FAQ">FAQ</Link>
        </nav>

        <HeaderSearch />

        <div className="header-tools">
          <Link className="header-cart" to="/cart" aria-label={`장바구니${cartCount > 0 ? `, ${cartCount}개` : ""}`}>
            <CartIcon />
            {cartCount > 0 ? <span className="header-cart-badge">{cartCount > 9 ? "9+" : cartCount}</span> : null}
          </Link>

          <div className="header-auth-actions">
            {isAuthenticated ? (
              <MemberMenu />
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

          <button className="menu" type="button" aria-label="메뉴 열기" aria-controls="site-menu" aria-expanded={drawer.isOpen} onClick={drawer.open}>
            <span />
            <span />
          </button>
        </div>
      </header>
      <SiteDrawer isOpen={drawer.isOpen} isAuthenticated={isAuthenticated} onClose={drawer.close} />
    </>
  );
}
