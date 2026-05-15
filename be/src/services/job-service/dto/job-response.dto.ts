export class JobResponseDto {
  id: number;
  crawlId: string | null;
  age: string | null;
  benefit: string | null;
  company: string | null;
  deadline: string | null;
  postedAt: Date | null;
  deadlineAt: Date | null;
  degree: string | null;
  description: string | null;
  experience: string | null;
  field: string | null;
  industry: string | null;
  location: string | null;
  otherInfo: string | null;
  requirement: string | null;
  salary: string | null;
  title: string;
  url: string | null;
  src: string | null;
  jobType: string | null;

  isInternship: boolean;

  isFresher: boolean;

  internshipDuration: string | null;

  internshipAllowance: string | null;

  hasMentor: boolean;

  trainingProgram: string | null;

  flexibleHours: boolean;

  vacancies: number | null;

  tagsBenefit: string | null;
  tagsRequirement: string | null;
  extractedSkills: string[] | null;
  skillsExtractedAt: Date | null;
  provinceIds: string | null;
  salaryMax: string | null;
  salaryMin: string | null;
  companyId: number | null;
  viewsCount: number;
  applyCount: number;
  popularityScore: number;
  indexedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
