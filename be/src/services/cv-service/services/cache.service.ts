import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

type MemoryEntry = { expiresAt: number; value: string };

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private readonly redis: Redis | null;
  private readonly prefix = process.env.CACHE_PREFIX?.trim() || "webthuctap";

  constructor() {
    const redisUrl = process.env.REDIS_URL?.trim();
    this.redis = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: false,
        })
      : null;
    this.redis?.on("error", (error) => {
      this.logger.warn(`Redis cache unavailable: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.fullKey(key);
    if (this.redis) {
      try {
        await this.ensureRedisConnected();
        const cached = await this.redis.get(fullKey);
        if (cached) return JSON.parse(cached) as T;
      } catch {
        // Fallback to memory cache.
      }
    }

    const item = this.memory.get(fullKey);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      this.memory.delete(fullKey);
      return null;
    }
    return JSON.parse(item.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!ttlSeconds || ttlSeconds <= 0) return;
    const fullKey = this.fullKey(key);
    const payload = JSON.stringify(value);

    if (this.redis) {
      try {
        await this.ensureRedisConnected();
        await this.redis.set(fullKey, payload, "EX", Math.ceil(ttlSeconds));
      } catch {
        // Keep memory cache warm if Redis is unavailable.
      }
    }

    this.memory.set(fullKey, {
      value: payload,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private fullKey(key: string) {
    return `${this.prefix}:${key}`;
  }

  private async ensureRedisConnected() {
    if (!this.redis || this.redis.status === "ready") return;
    if (this.redis.status === "connecting" || this.redis.status === "connect") return;
    await this.redis.connect();
  }
}
