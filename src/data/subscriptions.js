import { getContentBySlug } from "./content";
import { getCurrentSubscriptionDay, getSubscriptionDayCount } from "./dailyLessons";

export function getMySubscriptionCards(subscriptions) {
  const totalDays = getSubscriptionDayCount();
  return subscriptions.map((subscription) => {
    const content = getContentBySlug(subscription.slug);
    if (!content) return null;
    const todayDay = subscription.status === "scheduled" ? 0 : getCurrentSubscriptionDay(subscription.startDate);
    return { ...subscription, content, todayDay, totalDays, sendTime: `매일 ${subscription.delivery.time}`,
      statusLabel: { active: "구독중", scheduled: "시작 예정", expired: "기간 종료", paused: "이용 확인 중" }[subscription.status] || "이용 확인 중",
      progressPercent: Math.round((todayDay / totalDays) * 100) };
  }).filter(Boolean);
}
export function formatSubscriptionRange(start, end) { return `${start.replaceAll("-", ".")} – ${end.replaceAll("-", ".")}`; }
