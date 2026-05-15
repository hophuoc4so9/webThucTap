-- Migration: Seed default questionnaire templates
-- This migration populates the questionnaires table with default templates

INSERT INTO questionnaires (title, type, questions, "questionsToShow", "isActive", "createdAt", "updatedAt")
VALUES 
(
    'Technical Skills Assessment',
    'technical_skills',
    '[
        {
            "id": "tech_1",
            "question": "Select all programming languages you are proficient in:",
            "type": "multiple_choice",
            "options": ["Python", "JavaScript", "Java", "C++", "Go", "Rust", "TypeScript", "C#"],
            "weight": 2
        },
        {
            "id": "tech_2",
            "question": "Which frontend frameworks have you used?",
            "type": "multiple_choice",
            "options": ["React", "Vue", "Angular", "Svelte", "Next.js", "Flutter", "None"],
            "weight": 1.5
        },
        {
            "id": "tech_3",
            "question": "Which backend technologies are you experienced with?",
            "type": "multiple_choice",
            "options": ["Node.js", "Django", "Spring", "FastAPI", "Laravel", "Ruby on Rails", "None"],
            "weight": 1.5
        },
        {
            "id": "tech_4",
            "question": "What is your experience level with databases?",
            "type": "rating",
            "options": ["1 (Beginner)", "2", "3 (Intermediate)", "4", "5 (Expert)"],
            "weight": 1
        },
        {
            "id": "tech_5",
            "question": "Have you worked with cloud services (AWS, GCP, Azure)?",
            "type": "multiple_choice",
            "options": ["AWS", "GCP", "Azure", "Other", "None"],
            "weight": 1.5
        },
        {
            "id": "tech_6",
            "question": "Select your DevOps/Infrastructure experience:",
            "type": "multiple_choice",
            "options": ["Docker", "Kubernetes", "CI/CD", "Terraform", "None"],
            "weight": 1
        }
    ]'::jsonb,
    10,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

INSERT INTO questionnaires (title, type, questions, "questionsToShow", "isActive", "createdAt", "updatedAt")
VALUES 
(
    'Soft Skills & Communication',
    'soft_skills',
    '[
        {
            "id": "soft_1",
            "question": "Rate your leadership abilities:",
            "type": "rating",
            "options": ["1 (Minimal)", "2", "3 (Good)", "4", "5 (Excellent)"],
            "weight": 2
        },
        {
            "id": "soft_2",
            "question": "How would you rate your communication skills?",
            "type": "rating",
            "options": ["1 (Poor)", "2", "3 (Good)", "4", "5 (Excellent)"],
            "weight": 2
        },
        {
            "id": "soft_3",
            "question": "Experience with team collaboration:",
            "type": "multiple_choice",
            "options": ["Agile/Scrum", "Kanban", "Waterfall", "Remote teams", "Cross-functional"],
            "weight": 1.5
        },
        {
            "id": "soft_4",
            "question": "Problem-solving approach (rate):",
            "type": "rating",
            "options": ["1 (Need guidance)", "2", "3 (Independent)", "4", "5 (Strategic)"],
            "weight": 1.5
        }
    ]'::jsonb,
    8,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

INSERT INTO questionnaires (title, type, questions, "questionsToShow", "isActive", "createdAt", "updatedAt")
VALUES 
(
    'Work Environment Preferences',
    'work_environment',
    '[
        {
            "id": "env_1",
            "question": "Preferred work environment:",
            "type": "multiple_choice",
            "options": ["Remote", "On-site", "Hybrid"],
            "weight": 2
        },
        {
            "id": "env_2",
            "question": "Company size preference:",
            "type": "multiple_choice",
            "options": ["Startup (<50)", "Small (50-500)", "Medium (500-5000)", "Large (5000+)"],
            "weight": 1.5
        },
        {
            "id": "env_3",
            "question": "Industry preference:",
            "type": "multiple_choice",
            "options": ["Tech", "Finance", "Healthcare", "E-commerce", "Education", "Other"],
            "weight": 1
        }
    ]'::jsonb,
    7,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

INSERT INTO questionnaires (title, type, questions, "questionsToShow", "isActive", "createdAt", "updatedAt")
VALUES 
(
    'Career Goals & Aspirations',
    'career_goals',
    '[
        {
            "id": "goal_1",
            "question": "Primary career goal:",
            "type": "multiple_choice",
            "options": ["Technical expertise", "Management/Leadership", "Entrepreneurship", "Stable career growth", "Work-life balance"],
            "weight": 2
        },
        {
            "id": "goal_2",
            "question": "Preferred learning opportunities:",
            "type": "multiple_choice",
            "options": ["Training programs", "Mentorship", "Certification", "Project challenges", "Conference attendance"],
            "weight": 1.5
        },
        {
            "id": "goal_3",
            "question": "Years ahead planning horizon:",
            "type": "rating",
            "options": ["1 (Short-term)", "2", "3 (1-2 years)", "4", "5 (Long-term)"],
            "weight": 1
        }
    ]'::jsonb,
    8,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;
