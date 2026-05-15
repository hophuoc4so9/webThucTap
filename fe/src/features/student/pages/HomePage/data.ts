import {
  Search,
  Building2,
  FileText,
  BookOpen,
  Star,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

export const quickLinks = [
  {
    icon: Search,
    label: "Tìm việc làm",
    desc: "Khám phá hàng trăm cơ hội thực tập",
    path: "/student/jobs",
    color: "bg-blue-50 text-blue-600",
    border: "border-blue-100",
  },
  {
    icon: Building2,
    label: "Doanh nghiệp",
    desc: "Xem danh sách công ty đang tuyển dụng",
    path: "/student/companies",
    color: "bg-purple-50 text-purple-600",
    border: "border-purple-100",
  },
  {
    icon: FileText,
    label: "Hồ sơ của tôi",
    desc: "Quản lý CV và thông tin cá nhân",
    path: "/student/cv",
    color: "bg-green-50 text-green-600",
    border: "border-green-100",
  },
  {
    icon: BookOpen,
    label: "Đơn ứng tuyển",
    desc: "Theo dõi trạng thái các đơn đã nộp",
    path: "/student/applications",
    color: "bg-orange-50 text-orange-600",
    border: "border-orange-100",
  },
];

export const tips = [
  {
    icon: Star,
    text: "Hoàn thiện hồ sơ CV để tăng cơ hội được nhà tuyển dụng chú ý.",
  },
  {
    icon: TrendingUp,
    text: "Ứng tuyển sớm — nhiều vị trí đóng đơn trước hạn chót.",
  },
  {
    icon: CheckCircle,
    text: "Đọc kỹ yêu cầu công việc trước khi nộp đơn.",
  },
];
