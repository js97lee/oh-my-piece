import { Navigate, Route, Routes } from "react-router-dom";
import AccountPage from "./pages/AccountPage";
import AlimtalkTestPage from "./pages/AlimtalkTestPage";
import ContentDetailPage from "./pages/ContentDetailPage";
import EventsPage from "./pages/EventsPage";
import FaqPage from "./pages/FaqPage";
import LandingPage from "./pages/LandingPage";
import {
  GiftHistoryPage,
  GiftPage,
  MemberUtilityPage,
  SubscriptionDetailPage,
  SubscriptionPage,
} from "./pages/MemberPages";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import MyPage from "./pages/MyPage";
import NoticesPage from "./pages/NoticesPage";
import { PrivacyPage, TermsPage } from "./pages/PolicyPage";
import PurchasePage from "./pages/PurchasePage";
import SearchPage from "./pages/SearchPage";
import SignupPage from "./pages/SignupPage";

import { PaymentHistoryPage, PaymentResultPage } from "./pages/PaymentPages";
import RequireAuth from "./components/auth/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/alimtalk-test" element={<AlimtalkTestPage />} />
      <Route path="/notices" element={<NoticesPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/FAQ" element={<FaqPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/subscriptions" element={<SubscriptionPage />} />
        <Route path="/subscriptions/:slug" element={<SubscriptionDetailPage />} />
        <Route path="/coupons" element={<MemberUtilityPage title="쿠폰함" description="보유 중인 쿠폰과 사용 기간을 확인해요." />} />
        <Route path="/payments" element={<PaymentHistoryPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/gifts" element={<GiftPage />} />
        <Route path="/gifts/sent" element={<GiftHistoryPage type="sent" />} />
        <Route path="/gifts/received" element={<GiftHistoryPage type="received" />} />
        <Route path="/contents/:slug/purchase" element={<PurchasePage />} />
      </Route>
      <Route path="/contents/:slug" element={<ContentDetailPage />} />
      <Route path="/policies/terms" element={<TermsPage />} />
      <Route path="/policies/privacy" element={<PrivacyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
