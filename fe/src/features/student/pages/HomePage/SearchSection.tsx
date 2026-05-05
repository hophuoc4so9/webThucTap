import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Sparkles } from "lucide-react";

const LOCATIONS = [
  "Hồ Chí Minh",
  "Đồng Nai",
  "Tây Ninh",
];

export const SearchSection = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set("name", keyword);
    if (location) params.set("location", location);
    navigate(`/student/jobs?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-blue-600 to-blue-400 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-blue-100" />
          <h2 className="text-blue-100 text-sm font-semibold">Tìm kiếm công việc</h2>
        </div>

        <h3 className="text-white text-2xl font-bold mb-2">
          Khám phá cơ hội nghề nghiệp phù hợp
        </h3>
        <p className="text-blue-100 text-sm mb-6">
          Sử dụng AI để tìm công việc tuyệt vời dành cho bạn
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tên công việc, công ty, kỹ năng..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
            />
          </div>

          <div className="relative sm:w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer"
            >
              <option value="">Tất cả địa điểm</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSearch}
            className="px-7 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
};
