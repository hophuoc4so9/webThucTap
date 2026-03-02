import { Link } from "react-router-dom";
import { MapPin, Building2, Users, Briefcase } from "lucide-react";
import type { Company } from "@/features/company/types";

export function CompanyCard({ company: c }: { company: Company }) {
  return (
    <Link
      to={`/student/companies/${c.id}`}
      className="block bg-white rounded-xl border border-blue-100 overflow-hidden hover:shadow-md hover:border-blue-300 transition-all group"
    >
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-r from-blue-300 to-blue-500 overflow-hidden">
        {c.banner && (
          <img
            src={c.banner}
            alt=""
            className="w-full h-full object-cover opacity-70"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        {/* Logo */}
        <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-lg bg-white shadow border border-blue-100 flex items-center justify-center overflow-hidden">
          {c.logo ? (
            <img
              src={c.logo}
              alt={c.name}
              className="w-full h-full object-contain p-0.5"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <Building2 size={20} className="text-blue-400" />
          )}
        </div>
      </div>

      <div className="pt-7 px-4 pb-4">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
          {c.name}
        </h3>
        {c.industry && (
          <p className="text-xs text-gray-500 mt-0.5">{c.industry}</p>
        )}
        {c.shortDescription && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
            {c.shortDescription}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            {c.shortAddress && (
              <>
                <MapPin size={11} />
                <span className="truncate max-w-[120px]">{c.shortAddress}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {c.followers != null && (
              <span className="flex items-center gap-1">
                <Users size={11} />
                {c.followers}
              </span>
            )}
            {c.currentJobOpening != null && (
              <span className="flex items-center gap-1 text-blue-500 font-medium">
                <Briefcase size={11} />
                {c.currentJobOpening} vị trí
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
