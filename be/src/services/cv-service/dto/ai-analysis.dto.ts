export type AiRecommendation =
  | "use-current-cv"
  | "revise-current-cv"
  | "create-new-cv";

export interface CvImprovementItem {
  section: "summary" | "skills" | "experience" | "projects" | "general";
  issue: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
}

export interface CvSuggestionResponse {
  score: number;
  summary: string;
  strengths: string[];
  improvements: CvImprovementItem[];
  keywordsToAdd: string[];
  recommendation: Exclude<AiRecommendation, "use-current-cv">;
}

export interface ApplicationFitResponse {
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  missingKeywords: string[];
  recommendation: AiRecommendation;
  explanation: string;
  actionPlan: string[];
}
