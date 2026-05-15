import { useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { jobService } from "../JobsPage/services/jobService";
import type { Job, JobRecommendationResponse } from "../JobsPage/types";
import { JobCard } from "../JobsPage/components/JobCard";

export const RecommendedJobsSection = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    let canceled = false;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        let res: JobRecommendationResponse;

        if (user?.id) {
          res = await jobService.getPersonalizedRecommendations({
            userId: Number(user.id),
            topK: 6,
          });
        } else {
          res = {
            data: [],
            explanation: "Đăng nhập để nhận gợi ý công việc cá nhân hoá",
            page: 1,
            limit: 6,
            total: 0,
          };
        }

        if (canceled) return;

        setJobs(res.data.slice(0, 6));
        setExplanation(res.explanation || "Các công việc được gợi ý cho bạn");
      } catch (err) {
        if (!canceled) {
          setJobs([]);
          setExplanation("");
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    fetchRecommendations();

    return () => {
      canceled = true;
    };
  }, [user?.id]);

  if (!loading && jobs.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-blue-600" />
          <h2 className="text-lg font-bold text-blue-800">
            Công việc được gợi ý cho bạn
          </h2>
        </div>

        {explanation && (
          <p className="mb-4 text-sm text-blue-700">{explanation}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-blue-100 bg-white/80"
              />
            ))}
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-gray-400">
            Không có công việc được gợi ý
          </p>
        )}
      </div>
    </div>
  );
};
