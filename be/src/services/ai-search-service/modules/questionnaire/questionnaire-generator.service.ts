import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  QuestionnaireEntity,
  QuestionnaireType,
  QuestionItem,
} from "./questionnaire.entity";
import { QuestionnaireService } from "./questionnaire.service";

export interface CVProfile {
  skills: string[];
  experience: number; // years
  jobTitles: string[];
  industries: string[];
}

@Injectable()
export class QuestionnaireGeneratorService {
  private readonly logger = new Logger(
    QuestionnaireGeneratorService.name,
  );

  // Pre-defined question templates
  private technicalQuestionsBank: QuestionItem[] = [
    {
      id: "tech_1",
      question: "Select all programming languages you are proficient in:",
      type: "multiple_choice",
      options: [
        "Python",
        "JavaScript",
        "Java",
        "C++",
        "Go",
        "Rust",
        "TypeScript",
        "C#",
      ],
      weight: 2,
    },
    {
      id: "tech_2",
      question: "Which frontend frameworks have you used?",
      type: "multiple_choice",
      options: [
        "React",
        "Vue",
        "Angular",
        "Svelte",
        "Next.js",
        "Flutter",
        "None",
      ],
      weight: 1.5,
    },
    {
      id: "tech_3",
      question: "Which backend technologies are you experienced with?",
      type: "multiple_choice",
      options: [
        "Node.js",
        "Django",
        "Spring",
        "FastAPI",
        "Laravel",
        "Ruby on Rails",
        "None",
      ],
      weight: 1.5,
    },
    {
      id: "tech_4",
      question: "What is your experience level with databases?",
      type: "rating",
      options: ["1 (Beginner)", "2", "3 (Intermediate)", "4", "5 (Expert)"],
      weight: 1,
    },
    {
      id: "tech_5",
      question: "Have you worked with cloud services (AWS, GCP, Azure)?",
      type: "multiple_choice",
      options: ["AWS", "GCP", "Azure", "Other", "None"],
      weight: 1.5,
    },
    {
      id: "tech_6",
      question: "Select your DevOps/Infrastructure experience:",
      type: "multiple_choice",
      options: ["Docker", "Kubernetes", "CI/CD", "Terraform", "None"],
      weight: 1,
    },
  ];

  private softSkillsQuestionsBank: QuestionItem[] = [
    {
      id: "soft_1",
      question: "Rate your leadership abilities:",
      type: "rating",
      options: ["1 (Minimal)", "2", "3 (Good)", "4", "5 (Excellent)"],
      weight: 2,
    },
    {
      id: "soft_2",
      question: "How would you rate your communication skills?",
      type: "rating",
      options: ["1 (Poor)", "2", "3 (Good)", "4", "5 (Excellent)"],
      weight: 2,
    },
    {
      id: "soft_3",
      question: "Experience with team collaboration:",
      type: "multiple_choice",
      options: [
        "Agile/Scrum",
        "Kanban",
        "Waterfall",
        "Remote teams",
        "Cross-functional",
      ],
      weight: 1.5,
    },
    {
      id: "soft_4",
      question: "Problem-solving approach (rate):",
      type: "rating",
      options: ["1 (Need guidance)", "2", "3 (Independent)", "4", "5 (Strategic)"],
      weight: 1.5,
    },
  ];

  private workEnvironmentQuestionsBank: QuestionItem[] = [
    {
      id: "env_1",
      question: "Preferred work environment:",
      type: "multiple_choice",
      options: ["Remote", "On-site", "Hybrid"],
      correctAnswers: [],
      weight: 2,
    },
    {
      id: "env_2",
      question: "Company size preference:",
      type: "multiple_choice",
      options: ["Startup (<50)", "Small (50-500)", "Medium (500-5000)", "Large (5000+)"],
      weight: 1.5,
    },
    {
      id: "env_3",
      question: "Industry preference:",
      type: "multiple_choice",
      options: [
        "Tech",
        "Finance",
        "Healthcare",
        "E-commerce",
        "Education",
        "Other",
      ],
      weight: 1,
    },
  ];

  private careerGoalsQuestionsBank: QuestionItem[] = [
    {
      id: "goal_1",
      question: "Primary career goal:",
      type: "multiple_choice",
      options: [
        "Technical expertise",
        "Management/Leadership",
        "Entrepreneurship",
        "Stable career growth",
        "Work-life balance",
      ],
      weight: 2,
    },
    {
      id: "goal_2",
      question: "Preferred learning opportunities:",
      type: "multiple_choice",
      options: [
        "Training programs",
        "Mentorship",
        "Certification",
        "Project challenges",
        "Conference attendance",
      ],
      weight: 1.5,
    },
    {
      id: "goal_3",
      question: "Years ahead planning horizon:",
      type: "rating",
      options: ["1 (Short-term)", "2", "3 (1-2 years)", "4", "5 (Long-term)"],
      weight: 1,
    },
  ];

  constructor(
    @InjectRepository(QuestionnaireEntity)
    private questionnaireRepo: Repository<QuestionnaireEntity>,
    private questionnaireService: QuestionnaireService,
  ) {}

  /**
   * Generate customized questionnaire based on CV profile
   */
  async generateCustomQuestionnaire(
    cvProfile: CVProfile,
  ): Promise<QuestionnaireEntity> {
    const questions = this.selectQuestionsForProfile(cvProfile);

    // Create new custom questionnaire
    const questionnaire = new QuestionnaireEntity();
    questionnaire.title = `Personalized Assessment - ${new Date().toLocaleDateString()}`;
    questionnaire.type = QuestionnaireType.CUSTOM;
    questionnaire.questions = questions;
    questionnaire.questionsToShow = Math.min(15, questions.length);
    questionnaire.targetSkills = cvProfile.skills;
    questionnaire.targetCategories = cvProfile.industries;
    questionnaire.isActive = true;

    return this.questionnaireRepo.save(questionnaire);
  }

  /**
   * Select relevant questions based on CV profile
   */
  private selectQuestionsForProfile(
    profile: CVProfile,
  ): QuestionItem[] {
    const selectedQuestions: QuestionItem[] = [];

    // Always include work environment questions
    selectedQuestions.push(
      ...this.selectRandom(this.workEnvironmentQuestionsBank, 2),
    );

    // Include career goals
    selectedQuestions.push(
      ...this.selectRandom(this.careerGoalsQuestionsBank, 2),
    );

    // Select technical questions based on experience
    if (profile.experience > 2) {
      // For experienced devs, include more technical depth
      selectedQuestions.push(
        ...this.selectRandom(this.technicalQuestionsBank, 5),
      );
    } else {
      // For juniors, focus on soft skills and fundamentals
      selectedQuestions.push(
        ...this.selectRandom(this.technicalQuestionsBank, 2),
      );
      selectedQuestions.push(
        ...this.selectRandom(this.softSkillsQuestionsBank, 3),
      );
    }

    // Add soft skills for leadership-track candidates
    if (
      profile.jobTitles.some((t) =>
        /lead|manager|architect|director|senior/i.test(t),
      )
    ) {
      selectedQuestions.push(
        ...this.selectRandom(this.softSkillsQuestionsBank, 2),
      );
    }

    return selectedQuestions;
  }

  /**
   * Get or create template-based questionnaire by type
   */
  async getOrCreateTemplateQuestionnaire(
    type: QuestionnaireType,
  ): Promise<QuestionnaireEntity> {
    // Try to find existing active template
    let questionnaire = await this.questionnaireRepo.findOneBy({
      type,
      isActive: true,
    });

    if (questionnaire) {
      return questionnaire;
    }

    // Create new template
    questionnaire = new QuestionnaireEntity();
    questionnaire.title = this.getTemplateTitle(type);
    questionnaire.type = type;
    questionnaire.isActive = true;
    questionnaire.questionsToShow = 10;

    // Set questions based on type
    switch (type) {
      case QuestionnaireType.TECHNICAL_SKILLS:
        questionnaire.questions = this.technicalQuestionsBank;
        break;
      case QuestionnaireType.SOFT_SKILLS:
        questionnaire.questions = this.softSkillsQuestionsBank;
        break;
      case QuestionnaireType.WORK_ENVIRONMENT:
        questionnaire.questions = this.workEnvironmentQuestionsBank;
        break;
      case QuestionnaireType.CAREER_GOALS:
        questionnaire.questions = this.careerGoalsQuestionsBank;
        break;
      default:
        throw new Error(`Unknown questionnaire type: ${type}`);
    }

    return this.questionnaireRepo.save(questionnaire);
  }

  /**
   * Recommend questionnaire type based on CV
   */
  async recommendQuestionnaire(
    cvProfile: CVProfile,
  ): Promise<QuestionnaireType> {
    // Logic: recommend based on profile gaps and experience
    const yearsExp = cvProfile.experience || 0;

    if (yearsExp === 0) {
      // New grad: focus on fundamentals
      return QuestionnaireType.TECHNICAL_SKILLS;
    }

    if (yearsExp < 3) {
      // Junior: assess skills broadly
      return QuestionnaireType.TECHNICAL_SKILLS;
    }

    if (yearsExp < 8) {
      // Mid-level: assess soft skills for growth
      return QuestionnaireType.SOFT_SKILLS;
    }

    // Senior: focus on career goals and fit
    return QuestionnaireType.CAREER_GOALS;
  }

  /**
   * Select random items from array
   */
  private selectRandom<T>(items: T[], count: number): T[] {
    if (items.length <= count) return items;

    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get template title
   */
  private getTemplateTitle(type: QuestionnaireType): string {
    const titles: Record<QuestionnaireType, string> = {
      [QuestionnaireType.TECHNICAL_SKILLS]: "Technical Skills Assessment",
      [QuestionnaireType.SOFT_SKILLS]: "Soft Skills & Communication",
      [QuestionnaireType.WORK_ENVIRONMENT]: "Work Environment Preferences",
      [QuestionnaireType.CAREER_GOALS]: "Career Goals & Aspirations",
      [QuestionnaireType.CUSTOM]: "Custom Assessment",
    };

    return titles[type] || "Questionnaire";
  }
}
