import { AlertCircle } from "lucide-react";
import { tips } from "./data";

export const TipsSection = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <AlertCircle size={18} className="text-red-500" />
        Gợi ý cho bạn
      </h2>
      <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-4 p-4">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <tip.icon size={16} className="text-red-500" />
            </div>
            <p className="text-sm text-gray-600">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
