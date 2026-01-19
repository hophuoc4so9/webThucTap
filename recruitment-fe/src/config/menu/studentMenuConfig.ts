import { Home, FileText, Briefcase, BookOpen, MessageSquare, Settings, type LucideIcon } from 'lucide-react';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number; // Số lượng thông báo (optional)
}

export const studentMenuItems: MenuItem[] = [
  { 
    icon: Home, 
    label: 'Trang chủ', 
    path: '/student/dashboard' 
  },
  { 
    icon: Briefcase, 
    label: 'Tìm việc', 
    path: '/student/jobs' 
  },
  { 
    icon: FileText, 
    label: 'Hồ sơ của tôi', 
    path: '/student/cv' 
  },
  { 
    icon: BookOpen, 
    label: 'Đã ứng tuyển', 
    path: '/student/applications',
    badge: 3 
  },
  { 
    icon: MessageSquare, 
    label: 'Tin nhắn', 
    path: '/student/messages',
    badge: 5 
  },
  { 
    icon: Settings, 
    label: 'Cài đặt', 
    path: '/student/settings' 
  },
];