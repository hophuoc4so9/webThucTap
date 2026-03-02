import {
  Home,
  FileText,
  Briefcase,
  Building2,
  BookOpen,
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
    icon: FileText,
    label: "Hồ sơ của tôi",
    path: "/student/cv",
  },
  {
    icon: BookOpen,
    label: "Đã ứng tuyển",
    path: "/student/applications",
  },
  // {
  //   icon: MessageSquare,
  //   label: 'Tin nhắn',
  //   path: '/student/messages',
  //   badge: 5
  // },
  // {
  //   icon: Settings,
  //   label: 'Cài đặt',
  //   path: '/student/settings'
  // },
];
