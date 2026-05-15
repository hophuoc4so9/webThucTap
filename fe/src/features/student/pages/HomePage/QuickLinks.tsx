import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { quickLinks } from "./data";

export const QuickLinks = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Truy cập nhanh
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group bg-white border ${item.border} rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3`}
          >
            <div
              className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}
            >
              <item.icon size={20} />
            </div>
            <div>
              <p className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                {item.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
            <ArrowRight
              size={16}
              className="text-gray-300 group-hover:text-red-500 transition-colors mt-auto"
            />
          </Link>
        ))}
      </div>
    </div>
  );
};
