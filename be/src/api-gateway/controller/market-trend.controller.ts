import { Controller, Get, HttpException, Inject, Query } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";

@Controller("market-trends")
export class MarketTrendGatewayController {
  constructor(
    @Inject("JOB_SERVICE") private readonly jobClient: ClientProxy,
  ) {}

  @Get("overview")
  async overview(@Query() query: Record<string, any>) {
    try {
      const payload = this.buildQuery(query);
      return await firstValueFrom(this.jobClient.send("market_trends_query", payload));
    } catch (err: any) {
      const { statusCode = 500, message = "Loi may chu" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Get("by-major")
  async byMajor(@Query() query: Record<string, any>) {
    try {
      if (!query.major) {
        throw new HttpException({ success: false, message: "major la bat buoc" }, 400);
      }
      const payload = this.buildQuery(query);
      return await firstValueFrom(this.jobClient.send("market_trends_query", payload));
    } catch (err: any) {
      const { statusCode = 500, message = "Loi may chu" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  @Get("by-major-group")
  async byMajorGroup(@Query() query: Record<string, any>) {
    try {
      if (!query.majorGroup) {
        throw new HttpException({ success: false, message: "majorGroup la bat buoc" }, 400);
      }
      const payload = this.buildQuery(query);
      return await firstValueFrom(this.jobClient.send("market_trends_query", payload));
    } catch (err: any) {
      const { statusCode = 500, message = "Loi may chu" } = err?.error ?? err ?? {};
      throw new HttpException({ success: false, message }, statusCode);
    }
  }

  private buildQuery(query: Record<string, any>) {
    const days = query.days ? Number(query.days) : undefined;
    const horizon = query.horizon ? Number(query.horizon) : undefined;
    const limitClusters = query.limitClusters ? Number(query.limitClusters) : undefined;
    const includeForecast = query.includeForecast !== undefined
      ? query.includeForecast === "true" || query.includeForecast === true
      : undefined;

    return {
      major: query.major,
      majorGroup: query.majorGroup,
      days,
      horizon,
      limitClusters,
      includeForecast,
    };
  }
}

