import InfoLayout from "../components/info/InfoLayout";
import NoticeList from "../components/info/NoticeList";
import { notices } from "../data/info";

export default function NoticesPage() {
  return (
    <InfoLayout title="공지사항" description="오마이피스의 최신 안내를 확인하세요.">
      <NoticeList notices={notices} />
    </InfoLayout>
  );
}
