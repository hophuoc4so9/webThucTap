import {
  Home,
  FileText,
  Briefcase,
  Building2,
  BookOpen,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
}

export const studentMenuItems: MenuItem[] = [
  {
    icon: Home,
    label: "Trang chủ",
    path: "/student/home",
  },
  {
    icon: Briefcase,
    label: "Tìm việc",
    path: "/student/jobs",
  },
  {
    icon: Building2,
    label: "Công ty",
    path: "/student/companies",
  },
  {
    icon: FolderOpen,
    label: "Dự án từ doanh nghiệp",
    path: "/student/projects",
  },
  {
    icon: FileText,
    label: "Hồ sơ của tôi",
    path: "/student/cv",
  },
  {
    icon: BookOpen,
    label: "Đã ứng tuyển",
    path: "/student/applications",
  },
];
