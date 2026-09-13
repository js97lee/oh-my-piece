import InfoLayout from "../components/info/InfoLayout";
import NoticeList from "../components/info/NoticeList";
import { events } from "../data/info";

export default function EventsPage() {
  return (
    <InfoLayout title="이벤트" description="진행 중이거나 예정된 오마이피스 이벤트를 확인하세요.">
      <NoticeList notices={events} />
    </InfoLayout>
  );
}
