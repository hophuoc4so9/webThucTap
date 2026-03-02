import { ExternalLink } from "lucide-react";

interface QuickApplyCardProps {
  isStudent: boolean;
  applied: boolean;
  applySuccess: boolean;
  jobUrl?: string;
  onOpenApply: () => void;
}

export function QuickApplyCard({
  isStudent,
  applied,
  applySuccess,
  jobUrl,
  onOpenApply,
}: QuickApplyCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl p-5 text-center shadow-sm">
      <p className="text-white text-sm font-medium mb-3">Sẵn sàng ứng tuyển?</p>
      {isStudent ? (
        applied || applySuccess ? (
          <span className="w-full block py-2.5 bg-white text-green-600 rounded-lg text-sm font-semibold">
            ✓ Đã ứng tuyển
          </span>
        ) : (
          <button
            onClick={onOpenApply}
            className="w-full py-2.5 bg-white text-blue-500 hover:bg-blue-50 rounded-lg text-sm font-semibold transition-colors"
          >
            Ứng tuyển ngay
          </button>
        )
      ) : jobUrl ? (
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full block py-2.5 bg-white text-blue-500 hover:bg-blue-50 rounded-lg text-sm font-semibold transition-colors"
        >
          Ứng tuyển ngay <ExternalLink size={12} className="inline ml-1" />
        </a>
      ) : (
        <span className="w-full block py-2.5 bg-white/60 text-white rounded-lg text-sm font-semibold cursor-not-allowed">
          Chưa có link ứng tuyển
        </span>
      )}
    </div>
  );
}
