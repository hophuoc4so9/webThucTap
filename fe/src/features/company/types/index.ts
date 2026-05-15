export interface Company {
  id: number;
  name: string;
  logo?: string;
  banner?: string;
  shortDescription?: string;
  description?: string;
  industry?: string;
  size?: string;
  nationality?: string;
  website?: string;
  socialMedia?: string; // JSON string
  address?: string;
  shortAddress?: string;
  followers?: number;
  currentJobOpening?: number;
  aboutImages?: string; // JSON string of URL[]
}

export interface CompanyListResponse {
  data: Company[];
  total: number;
  page: number;
  limit: number;
}
