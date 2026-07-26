import { getContentBySlug } from "./content";
import { getCurrentSubscriptionDay, getSubscriptionDayCount } from "./dailyLessons";

/** 데모용 다중 구독 — 실제 결제 연동 전까지 UI 미리보기 */
export const mySubscriptions = [
  {
    id: "sub-english-basic",
    slug: "daily-english-word",
    startDate: "2026-07-14",
    endDate: "2027-07-13",
    sendTime: "매일 오전 8:00",
    status: "active",
  },
  {
    id: "sub-math-basic",
    slug: "math-basic",
    startDate: "2026-07-20",
    endDate: "2027-07-19",
    sendTime: "매일 오전 7:30",
    status: "active",
  },
  {
    id: "sub-english-mid",
    slug: "english-intermediate",
    startDate: "2026-06-01",
    endDate: "2027-05-31",
    sendTime: "매일 오후 8:00",
    status: "active",
  },
];

export function getMySubscriptionBySlug(slug) {
  return mySubscriptions.find((item) => item.slug === slug) ?? null;
}

export function getMySubscriptionCards() {
  const totalDays = getSubscriptionDayCount();

  return mySubscriptions
    .map((subscription) => {
      const content = getContentBySlug(subscription.slug);
      if (!content) return null;

      const todayDay = getCurrentSubscriptionDay(subscription.startDate);
      return {
        ...subscription,
        content,
        todayDay,
        totalDays,
        progressPercent: Math.round((todayDay / totalDays) * 100),
      };
    })
    .filter(Boolean);
}

export function formatSubscriptionRange(start, end) {
  return `${start.replaceAll("-", ".")} – ${end.replaceAll("-", ".")}`;
}
