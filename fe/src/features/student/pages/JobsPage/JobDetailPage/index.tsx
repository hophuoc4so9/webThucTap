import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  GraduationCap,
  BookOpen,
  Users,
  Briefcase,
} from "lucide-react";
import { jobService } from "../services/jobService";
import { companyService } from "@/features/company/services/companyService";
import { cvApi } from "@/api/api/services/cv.api";
import { applicationApi } from "@/api/api/services/application.api";
import type { Job } from "../types";
import type { Company } from "@/features/company/types";
import type { Cv } from "@/features/student/types";

import { JobHeader } from "./components/JobHeader";
import { JobMetaInfo } from "./components/JobMetaInfo";
import { SectionCard, BulletList } from "./components/JobSections";
import { CompanyCard, CompanyFallback } from "./components/CompanyCard";
import { QuickApplyCard } from "./components/QuickApplyCard";
import { ApplyModal } from "./components/ApplyModal";

function safeParse<T>(json: string | undefined | null, fallback: T): T {
  try {
    return JSON.parse(json || "") as T;
  } catch {
    return fallback;
  }
}

export const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const user = useSelector((s: RootState) => s.auth.user);
  const isStudent = user?.role === "STUDENT";
  const userId = user ? Number(user.id) : 0;

  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  /* Apply state */
  const [applied, setApplied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [userCvs, setUserCvs] = useState<Cv[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<number | "">("");
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);

  /* Fetch job + company */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await jobService.getJobById(id);
        if (cancelled) return;
        setJob(data);

        if (data.companyRef) {
          setCompany(data.companyRef);
        } else if (data.company) {
          const found = await companyService.getCompanyByName(data.company);
          if (!cancelled) setCompany(found);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]); 


  useEffect(() => {
    if (!id || !isStudent || !userId) return;
    let cancelled = false;
    (async () => {
      const [check, cvList] = await Promise.allSettled([
        applicationApi.checkApplied(userId, Number(id)),
        cvApi.getByUser(userId),
      ]);
      if (!cancelled) {
        if (check.status === "fulfilled") setApplied(check.value.applied);
        if (cvList.status === "fulfilled") setUserCvs(cvList.value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, userId]); // eslint-disable-line

  const handleApply = async () => {
    if (!job || !userId) return;
    setApplyError("");
    setApplying(true);
    try {
      await applicationApi.create({
        userId,
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.company,
        cvId: selectedCvId !== "" ? selectedCvId : undefined,
        coverLetter: coverLetter || undefined,
      });
      setApplied(true);
      setApplySuccess(true);
      setApplyOpen(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setApplyError(msg ?? "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setApplying(false);
    }
  };

  
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

 
  if (!job) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center text-gray-500">
        <p className="text-lg">Không tìm thấy thông tin công việc.</p>
        <Link
          to="/student/jobs"
          className="mt-4 inline-flex items-center gap-1 text-blue-500 hover:underline text-sm"
        >
          <ChevronLeft size={16} /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  const tags = safeParse<string[]>(job.tagsRequirement, []);
  const benefits = safeParse<string[]>(job.tagsBenefit, []);
  const resolvedCompany = job.companyRef ?? company;

  const metaItems = [
    { icon: Clock, label: "Hạn nộp", value: job.deadline },
    { icon: DollarSign, label: "Mức lương", value: job.salary },
    { icon: GraduationCap, label: "Kinh nghiệm", value: job.experience },
    { icon: BookOpen, label: "Học vấn", value: job.degree },
    {
      icon: Users,
      label: "Số lượng",
      value: job.vacancies ? `${job.vacancies} người` : null,
    },
    { icon: Briefcase, label: "Loại công việc", value: job.jobType },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Back link */}
        <Link
          to="/student/jobs"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 mb-5 transition-colors"
        >
          <ChevronLeft size={16} /> Danh sách việc làm
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          
          <div className="flex-1 min-w-0 space-y-5">
            <JobHeader
              job={job}
              isStudent={isStudent}
              applied={applied}
              applySuccess={applySuccess}
              onOpenApply={() => setApplyOpen(true)}
            />

            <JobMetaInfo items={metaItems} />

            {/* Mô tả công việc */}
            {job.description && (
              <SectionCard title="Mô tả công việc" accent="blue">
                <BulletList text={job.description} />
              </SectionCard>
            )}

            {/* Yêu cầu ứng viên */}
            {(job.requirement || tags.length > 0) && (
              <SectionCard title="Yêu cầu ứng viên" accent="orange">
                {job.requirement && <BulletList text={job.requirement} />}
                {tags.length > 0 && (
                  <div
                    className={
                      job.requirement
                        ? "mt-4 pt-4 border-t border-gray-100"
                        : ""
                    }
                  >
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Kỹ năng
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Quyền lợi */}
            {(job.benefit || benefits.length > 0) && (
              <SectionCard title="Quyền lợi" accent="green">
                {job.benefit && <BulletList text={job.benefit} color="green" />}
                {benefits.length > 0 && (
                  <div
                    className={
                      job.benefit ? "mt-4 pt-4 border-t border-gray-100" : ""
                    }
                  >
                    <div className="flex flex-wrap gap-2">
                      {benefits.map((b, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium"
                        >
                          <CheckCircle2
                            size={11}
                            className="text-green-500 flex-shrink-0"
                          />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}
          </div>

          <aside className="lg:w-72 flex-shrink-0 space-y-5">
            <QuickApplyCard
              isStudent={isStudent}
              applied={applied}
              applySuccess={applySuccess}
              jobUrl={job.url}
              onOpenApply={() => setApplyOpen(true)}
            />

            {resolvedCompany ? (
              <CompanyCard company={resolvedCompany} />
            ) : job.company ? (
              <CompanyFallback name={job.company} />
            ) : null}
          </aside>
        </div>
      </div>

      {/* Apply Modal */}
      {applyOpen && (
        <ApplyModal
          jobTitle={job.title}
          userCvs={userCvs}
          selectedCvId={selectedCvId}
          coverLetter={coverLetter}
          applying={applying}
          applyError={applyError}
          onSelectCv={setSelectedCvId}
          onCoverLetterChange={setCoverLetter}
          onApply={handleApply}
          onClose={() => setApplyOpen(false)}
        />
      )}

      
      {applySuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm">
          <CheckCircle2 size={15} /> Ứng tuyển thành công!
        </div>
      )}
    </div>
  );
};

export default JobDetailPage;
