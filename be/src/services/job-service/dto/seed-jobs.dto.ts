/** DTO cho một bản ghi trong batch seed từ file crawl */
export class SeedJobItemDto {
  crawlId?: string;
  age?: string;
  benefit?: string;
  company?: string;
  deadline?: string;
  degree?: string;
  description?: string;
  experience?: string;
  field?: string;
  industry?: string;
  location?: string;
  otherInfo?: string;
  requirement?: string;
  salary?: string;
  title: string;
  url?: string;
  src: string;
  tagsBenefit?: string;
  tagsRequirement?: string;
  provinceIds?: string;
  salaryMax?: string;
  salaryMin?: string;
}

export class SeedJobsDto {
  jobs: SeedJobItemDto[];
}
