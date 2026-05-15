import { useMemo } from "react";
import donviData from "@/data/donviTDMU.json";

export interface UniversityMajor {
  name: string;
  code: string;
  group: string;
}

export function useMajors() {
  return useMemo(() => {
    const data = donviData as any;
    const majors: UniversityMajor[] = [];

    (data.du_lieu_nganh || []).forEach((group: any) => {
      (group.nganh_hoc || []).forEach((major: any) => {
        majors.push({
          name: major.ten || "",
          code: major.id_news || "",
          group: group.nhom || "",
        });
      });
    });

    return majors.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, []);
}

export function useMajorGroups() {
  return useMemo(() => {
    const data = donviData as any;
    return (data.du_lieu_nganh || []).map((group: any) => ({
      nhom: group.nhom || "",
      nganh_hoc: (group.nganh_hoc || []).map((m: any) => ({
        ten: m.ten || "",
        id_news: m.id_news || "",
      })),
    }));
  }, []);
}
