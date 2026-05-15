import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { MarketTrendService } from "../services/market-trend.service";
import { MarketTrendQueryDto } from "../dto/market-trend.dto";

@Controller()
export class MarketTrendController {
  constructor(private readonly marketTrendService: MarketTrendService) {}

  @MessagePattern("market_trends_query")
  getTrends(@Payload() query: MarketTrendQueryDto) {
    return this.marketTrendService.getTrends(query);
  }
}
