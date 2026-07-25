import { Link } from "react-router-dom";
import { memberMenuGroups, policyLinks, serviceLinks } from "../../data/site";
import { logoutAuth } from "../../hooks/useAuthPreview";
import KakaoLoginButton from "../auth/KakaoLoginButton";
import { BrandLink } from "../brand/Brand";

function MenuIcon({ name }) {
  const paths = {
    book: (
      <>
        <path d="M5 5h9a4 4 0 0 1 4 4v10H9a4 4 0 0 0-4 0V5Z" />
        <path d="M8 9h6M8 13h5" />
      </>
    ),
    ticket: <path d="M5 7h14v3a2 2 0 0 0 0 4v3H5v-3a2 2 0 0 0 0-4V7Z" />,
    card: (
      <>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M4 10h16" />
      </>
    ),
    gift: (
      <>
        <path d="M4 10h16v10H4V10ZM3 7h18v4H3V7ZM12 7v13" />
        <path d="M12 7H8.5a2 2 0 1 1 2-2c0 2 1.5 2 1.5 2Zm0 0h3.5a2 2 0 1 0-2-2c0 2-1.5 2-1.5 2Z" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 14.8 6L14.5 3h-5L9.2 6a8 8 0 0 0-1.7 1.1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1A8 8 0 0 0 9.2 18l.3 3h5l.3-3a8 8 0 0 0 1.7-1.1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
      </>
    ),
  };

  return (
    <svg className="drawer-item-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function MemberDrawer({ onClose }) {
  const logout = () => {
    logoutAuth();
    onClose();
  };

  return (
    <div className="drawer-member">
      <Link className="drawer-subscription" to="/subscriptions" onClick={onClose}>
        <span className="drawer-subscription-icon">
          <MenuIcon name="book" />
        </span>
        <strong>내 구독 보기</strong>
        <span aria-hidden="true">›</span>
      </Link>
      {memberMenuGroups.map((group) => (
        <section className="drawer-menu-group" key={group.title}>
          <h2>{group.title}</h2>
          {group.items.map((item) => (
            <Link className="drawer-menu-item" to={item.to} onClick={onClose} key={item.to}>
              <MenuIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </section>
      ))}
      <button className="drawer-menu-item drawer-logout" type="button" onClick={logout}>
        <MenuIcon name="logout" />
        <span>로그아웃</span>
      </button>
    </div>
  );
}

export default function SiteDrawer({ isOpen, isAuthenticated, onClose }) {
  const links = [...serviceLinks, ...policyLinks];

  return (
    <aside
      className={`drawer${isOpen ? " open" : ""}`}
      id="site-menu"
      aria-hidden={!isOpen}
      onClick={(event) => event.target.classList.contains("drawer") && onClose()}
    >
      <div className="drawer-panel">
        <div className="drawer-head">
          <BrandLink className="drawer-brand" onClick={onClose} />
          <button className="drawer-close" type="button" aria-label="메뉴 닫기" onClick={onClose}>
            ×
          </button>
        </div>
        {isAuthenticated ? (
          <MemberDrawer onClose={onClose} />
        ) : (
          <>
            <nav className="drawer-links" aria-label="서비스 메뉴">
              {links.map((link) => (
                <Link to={link.to} onClick={onClose} key={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="drawer-auth">
              <KakaoLoginButton variant="drawer" />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
