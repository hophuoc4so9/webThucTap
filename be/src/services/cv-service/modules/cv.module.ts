import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cv } from "../entities/cv.entity";
import { Application } from "../entities/application.entity";
import { CvController } from "../controllers/cv.controller";
import { ApplicationController } from "../controllers/application.controller";
import { CvService } from "../services/cv.service";
import { ApplicationService } from "../services/application.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true, // chỉ dùng cho dev
    }),
    TypeOrmModule.forFeature([Cv, Application]),
  ],
  controllers: [CvController, ApplicationController],
  providers: [CvService, ApplicationService],
})
export class CvModule {}
