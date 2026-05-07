import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiSearchController } from "../controllers/ai-search.controller";
import { EmbeddingService } from "../services/embedding.service";
import { SearchService } from "../services/search.service";
import { RecommendationService } from "../services/recommendation.service";
import { QuestionnaireModule } from "./questionnaire/questionnaire.module";
import { CacheService } from "../services/cache.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || "jobdb",
      autoLoadEntities: true,
      synchronize: true,
      extra: { max: 5, idleTimeoutMillis: 30000 },
    }),
    QuestionnaireModule,
  ],
  controllers: [AiSearchController],
  providers: [EmbeddingService, SearchService, RecommendationService, CacheService],
  exports: [EmbeddingService, SearchService, RecommendationService],
})
export class AiSearchModule {}
