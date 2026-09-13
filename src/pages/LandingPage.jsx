import ContentCatalog from "../components/catalog/ContentCatalog";
import FlowSection from "../components/catalog/FlowSection";
import HeroSlider from "../components/catalog/HeroSlider";
import LandingPopupBanner from "../components/catalog/LandingPopupBanner";
import ChannelTalkWidget from "../components/layout/ChannelTalkWidget";
import MobilePageShell from "../components/layout/MobilePageShell";
import { contentSections } from "../data/content";
import { flowSteps, heroBanners } from "../data/site";
import { useScrollReveal } from "../hooks/useScrollReveal";

export default function LandingPage() {
  useScrollReveal(contentSections.length);

  return (
    <MobilePageShell mainId="top" overlay={<ChannelTalkWidget />}>
      <HeroSlider banners={heroBanners} />
      <ContentCatalog sections={contentSections} />
      <FlowSection steps={flowSteps} />
      <LandingPopupBanner />
    </MobilePageShell>
  );
}
