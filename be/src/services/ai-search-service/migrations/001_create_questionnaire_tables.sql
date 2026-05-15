-- Migration: Create questionnaire tables for quiz/assessment system
-- This migration creates tables for storing questionnaires, user answers, and scoring

-- Create questionnaire_type enum if not exists
DO $$ BEGIN
    CREATE TYPE questionnaire_type AS ENUM ('technical_skills', 'soft_skills', 'work_environment', 'career_goals', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create questionnaires table
CREATE TABLE IF NOT EXISTS questionnaires (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type questionnaire_type DEFAULT 'custom',
    questions JSONB NOT NULL,
    "targetCategories" JSONB,
    "targetSkills" JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "questionsToShow" INTEGER DEFAULT 10,
    "scoringConfig" JSON,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT questionnaire_title_not_empty CHECK (title != ''),
    CONSTRAINT questionnaire_questions_not_empty CHECK (jsonb_array_length(questions) > 0)
);

-- Create index for active questionnaires
CREATE INDEX IF NOT EXISTS idx_questionnaires_type_active 
    ON questionnaires(type, "isActive") 
    WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_questionnaires_created_at 
    ON questionnaires("createdAt");

-- Create questionnaire_answers table (stores user responses and scores)
CREATE TABLE IF NOT EXISTS questionnaire_answers (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "questionnaireId" INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score FLOAT,
    "scoreBreakdown" JSONB,
    "recommendedCategories" JSONB,
    "recommendedSkills" JSONB,
    "profileSummary" TEXT,
    "recommendationsProcessed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT answer_score_valid CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    CONSTRAINT answer_user_not_null CHECK ("userId" > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_user_id 
    ON questionnaire_answers("userId");

CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_user_created 
    ON questionnaire_answers("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_questionnaire_id 
    ON questionnaire_answers("questionnaireId");

CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_recommendations_pending 
    ON questionnaire_answers("recommendationsProcessed")
    WHERE "recommendationsProcessed" = false;

-- Add comment for context
COMMENT ON TABLE questionnaires IS 'Stores questionnaire templates for skill assessment and job matching';
COMMENT ON TABLE questionnaire_answers IS 'Stores user answers to questionnaires and their calculated scores/recommendations';
COMMENT ON COLUMN questionnaires.questions IS 'JSON array of QuestionItem objects: [{id, question, type, options, correctAnswers, weight}]';
COMMENT ON COLUMN questionnaire_answers.answers IS 'JSON object: {questionId: answer_value}';
COMMENT ON COLUMN questionnaire_answers.score IS 'Overall score out of 100';
COMMENT ON COLUMN questionnaire_answers."recommendedCategories" IS 'JSON array of recommended job categories based on answers';

COMMENT ON COLUMN questionnaire_answers."recommendedSkills" IS 'JSON array of recommended skills based on answers';
-- Optionally add trigger to update timestamp
CREATE OR REPLACE FUNCTION update_questionnaire_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS questionnaire_update_timestamp ON questionnaires;
CREATE TRIGGER questionnaire_update_timestamp
    BEFORE UPDATE ON questionnaires
    FOR EACH ROW
    EXECUTE FUNCTION update_questionnaire_timestamp();
