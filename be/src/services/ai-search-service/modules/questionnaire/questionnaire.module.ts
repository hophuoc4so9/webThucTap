import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestionnaireEntity } from "./questionnaire.entity";
import { QuestionnaireAnswerEntity } from "./questionnaire-answer.entity";
import { QuestionnaireService } from "./questionnaire.service";
import { QuestionnaireGeneratorService } from "./questionnaire-generator.service";
import { QuestionnaireController } from "./questionnaire.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionnaireEntity,
      QuestionnaireAnswerEntity,
    ]),
  ],
  providers: [QuestionnaireService, QuestionnaireGeneratorService],
  controllers: [QuestionnaireController],
  exports: [QuestionnaireService, QuestionnaireGeneratorService],
})
export class QuestionnaireModule {}
