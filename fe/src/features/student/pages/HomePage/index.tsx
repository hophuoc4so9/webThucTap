import { HeroBanner } from "./HeroBanner";
import { QuickLinks } from "./QuickLinks";
import { TipsSection } from "./TipsSection";
import { SearchSection } from "./SearchSection";
import { RecommendedJobsSection } from "./RecommendedJobsSection";

export const StudentHomePage = () => {
  return (
    <div className="space-y-0">
      <HeroBanner />
      <SearchSection />
      <div className="py-8">
        <RecommendedJobsSection />
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <QuickLinks />
        <TipsSection />
      </div>
    </div>
  );
};

export default StudentHomePage;
