export interface JobFormData {
  title: string;
  location: string;
  salary: string;
  deadline: string;
  industry: string;
  jobType: string;
  experience: string;
  degree: string;
  vacancies: string;
  description: string;
  requirement: string;
  benefit: string;
  url: string;
}

export const EMPTY_FORM: JobFormData = {
  title: "",
  location: "",
  salary: "",
  deadline: "",
  industry: "",
  jobType: "Toàn thời gian",
  experience: "",
  degree: "",
  vacancies: "",
  description: "",
  requirement: "",
  benefit: "",
  url: "",
};
