import {
  Controller,
  Get,
  Param,
  Inject,
  HttpException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("ai-tasks")
export class AiTaskController {
  constructor(@Inject("CV_SERVICE") private readonly cvClient: ClientProxy) {}

  /** GET /ai-tasks/:id */
  @Get(":id")
  async getStatus(@Param("id") id: string) {
    try {
      return await firstValueFrom(
        this.cvClient.send("ai_task_status", { taskId: id }),
      );
    } catch (err: any) {
      const { statusCode = 500, message = "Lỗi máy chủ" } =
        err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }
}
