import { useEffect, useState } from "react";
import {
  clearKakaoSession,
  isKakaoAuthenticated,
  subscribeAuthChange,
} from "../services/kakaoAuth";
import { clearLocalMember, isLocalAuthenticated } from "../services/localAuth";

const PREVIEW_KEY = "oh_my_piece_preview_member";
const PREVIEW_EVENT = "oh-my-piece-auth-preview";

function getPreviewState() {
  return window.localStorage.getItem(PREVIEW_KEY) === "true";
}

export function setAuthPreview(isAuthenticated) {
  window.localStorage.setItem(PREVIEW_KEY, String(isAuthenticated));
  window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: isAuthenticated }));
}

export function logoutAuth() {
  clearKakaoSession();
  clearLocalMember();
  setAuthPreview(false);
}

function getAuthState() {
  return isKakaoAuthenticated() || isLocalAuthenticated() || getPreviewState();
}

export function useAuthPreview() {
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState);

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(getAuthState());
    };

    const unsubscribe = subscribeAuthChange(syncAuthState);
    window.addEventListener(PREVIEW_EVENT, syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      unsubscribe();
      window.removeEventListener(PREVIEW_EVENT, syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  return isAuthenticated;
}
