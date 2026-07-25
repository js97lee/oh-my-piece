import { useEffect, useState } from "react";

const PREVIEW_KEY = "oh_my_piece_preview_member";
const PREVIEW_EVENT = "oh-my-piece-auth-preview";

function getPreviewState() {
  return window.localStorage.getItem(PREVIEW_KEY) === "true";
}

export function setAuthPreview(isAuthenticated) {
  window.localStorage.setItem(PREVIEW_KEY, String(isAuthenticated));
  window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: isAuthenticated }));
}

export function useAuthPreview() {
  const [isAuthenticated, setIsAuthenticated] = useState(getPreviewState);

  useEffect(() => {
    const syncPreviewState = (event) => {
      setIsAuthenticated(event.type === PREVIEW_EVENT ? event.detail : getPreviewState());
    };

    window.addEventListener(PREVIEW_EVENT, syncPreviewState);
    window.addEventListener("storage", syncPreviewState);

    return () => {
      window.removeEventListener(PREVIEW_EVENT, syncPreviewState);
      window.removeEventListener("storage", syncPreviewState);
    };
  }, []);

  return isAuthenticated;
}
