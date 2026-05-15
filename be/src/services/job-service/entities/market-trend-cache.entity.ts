import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("market_trend_cache")
@Index(["cacheKey"], { unique: true })
@Index(["expiresAt"])
export class MarketTrendCache {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "text" })
  cacheKey: string;

  @Column({ type: "jsonb" })
  data: any;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
