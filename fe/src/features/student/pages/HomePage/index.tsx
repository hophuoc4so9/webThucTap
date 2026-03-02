import { HeroBanner } from "./HeroBanner";
import { QuickLinks } from "./QuickLinks";
import { TipsSection } from "./TipsSection";

export const StudentHomePage = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <HeroBanner />
      <QuickLinks />
      <TipsSection />
    </div>
  );
};

export default StudentHomePage;
