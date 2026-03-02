import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Globe,
  Users,
  Briefcase,
  Heart,
  Factory,
} from "lucide-react";
import type { Company } from "@/features/company/types";

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-50 border-b border-blue-100 px-5 py-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-blue-500 flex-shrink-0" />
        <h2 className="font-semibold text-sm text-blue-700">Về công ty</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Logo + name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="w-full h-full object-contain p-1"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <Building2 size={22} className="text-blue-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-800 leading-snug">
              {company.name}
            </p>
            {company.industry && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                {company.industry}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        {(company.followers != null || company.currentJobOpening != null) && (
          <div className="grid grid-cols-2 gap-2">
            {company.followers != null && (
              <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                <Heart size={13} className="text-blue-400 mx-auto mb-0.5" />
                <p className="text-sm font-bold text-blue-600">
                  {company.followers >= 1000
                    ? `${(company.followers / 1000).toFixed(1)}k`
                    : company.followers}
                </p>
                <p className="text-[10px] text-gray-400">Theo dõi</p>
              </div>
            )}
            {company.currentJobOpening != null && (
              <div className="bg-green-50 rounded-lg p-2.5 text-center">
                <Briefcase
                  size={13}
                  className="text-green-500 mx-auto mb-0.5"
                />
                <p className="text-sm font-bold text-green-600">
                  {company.currentJobOpening}
                </p>
                <p className="text-[10px] text-gray-400">Việc mở</p>
              </div>
            )}
          </div>
        )}

        {/* Info rows */}
        <div className="space-y-2.5 text-xs text-gray-600">
          {company.size && (
            <div className="flex items-start gap-2">
              <Users size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <span>{company.size} nhân viên</span>
            </div>
          )}
          {company.nationality && (
            <div className="flex items-start gap-2">
              <Globe size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <span>{company.nationality}</span>
            </div>
          )}
          {company.industry && (
            <div className="flex items-start gap-2">
              <Factory
                size={12}
                className="text-blue-400 mt-0.5 flex-shrink-0"
              />
              <span>{company.industry}</span>
            </div>
          )}
          {(company.shortAddress || company.address) && (
            <div className="flex items-start gap-2">
              <MapPin
                size={12}
                className="text-blue-400 mt-0.5 flex-shrink-0"
              />
              <span className="leading-snug">
                {company.shortAddress ?? company.address}
              </span>
            </div>
          )}
          {company.website && (
            <div className="flex items-start gap-2">
              <Globe size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline truncate"
              >
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>

        <Link
          to={`/student/companies/${company.id}`}
          className="w-full block text-center py-2 border border-blue-300 text-blue-500 hover:bg-blue-50 rounded-lg text-sm transition-colors"
        >
          Xem trang công ty
        </Link>
      </div>
    </div>
  );
}

/* ── Minimal fallback when company details unavailable ─────── */
interface CompanyFallbackProps {
  name: string;
}

export function CompanyFallback({ name }: CompanyFallbackProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <Building2 size={20} className="text-blue-400" />
        </div>
        <div>
          <p className="font-medium text-sm text-gray-800">{name}</p>
          <p className="text-xs text-gray-400">Nhà tuyển dụng</p>
        </div>
      </div>
    </div>
  );
}
