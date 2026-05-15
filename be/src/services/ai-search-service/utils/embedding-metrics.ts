/**
 * Embedding metrics and monitoring
 * Tracks: tokenizer errors, fallback usage, success rates, performance
 */

import { Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

export interface TokenizerErrorEvent {
  timestamp: Date;
  jobId?: number;
  error: string;
  errorType: "tokenizer_length" | "tokenizer_other" | "invalid_input";
  inputLength: number;
  usedFallback: boolean;
  duration: number; // ms
}

export interface EmbeddingMetrics {
  totalProcessed: number;
  successCount: number;
  fallbackCount: number;
  errorCount: number;
  emptyInputCount: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  successRate: number;
  fallbackRate: number;
}

export class EmbeddingMetricsTracker {
  private logger = new Logger("EmbeddingMetricsTracker");
  private events: TokenizerErrorEvent[] = [];
  private metrics: Map<string, any> = new Map();
  private counters = {
    totalProcessed: 0,
    successCount: 0,
    fallbackCount: 0,
    errorCount: 0,
    emptyInputCount: 0,
  };
  private durations: number[] = [];
  private logFilePath: string;

  constructor(logDir: string = "./logs/embeddings") {
    this.logFilePath = path.join(logDir, "embedding-metrics.log");
    this.ensureLogDir(logDir);
  }

  /**
   * Record a successful embedding generation
   */
  recordSuccess(jobId?: number, duration: number = 0, inputLength: number = 0): void {
    this.counters.successCount++;
    this.counters.totalProcessed++;
    if (duration > 0) {
      this.durations.push(duration);
    }
  }

  /**
   * Record a fallback embedding usage
   */
  recordFallback(
    jobId?: number,
    error: string = "",
    errorType: "tokenizer_length" | "tokenizer_other" | "invalid_input" = "tokenizer_other",
    duration: number = 0,
    inputLength: number = 0,
  ): void {
    this.counters.fallbackCount++;
    this.counters.totalProcessed++;
    if (duration > 0) {
      this.durations.push(duration);
    }

    const event: TokenizerErrorEvent = {
      timestamp: new Date(),
      jobId,
      error,
      errorType,
      inputLength,
      usedFallback: true,
      duration,
    };

    this.events.push(event);
    this.logEvent(event);
  }

  /**
   * Record an error during embedding generation
   */
  recordError(
    jobId?: number,
    error: string = "",
    errorType: "tokenizer_length" | "tokenizer_other" | "invalid_input" = "tokenizer_other",
    duration: number = 0,
    inputLength: number = 0,
  ): void {
    this.counters.errorCount++;
    this.counters.totalProcessed++;
    if (duration > 0) {
      this.durations.push(duration);
    }

    const event: TokenizerErrorEvent = {
      timestamp: new Date(),
      jobId,
      error,
      errorType,
      inputLength,
      usedFallback: false,
      duration,
    };

    this.events.push(event);
    this.logEvent(event);
  }

  /**
   * Record empty input that was skipped
   */
  recordEmptyInput(jobId?: number): void {
    this.counters.emptyInputCount++;
  }

  /**
   * Get current metrics summary
   */
  getMetrics(): EmbeddingMetrics {
    const avgDuration =
      this.durations.length > 0
        ? this.durations.reduce((a, b) => a + b, 0) / this.durations.length
        : 0;

    const maxDuration =
      this.durations.length > 0 ? Math.max(...this.durations) : 0;

    const minDuration =
      this.durations.length > 0 ? Math.min(...this.durations) : 0;

    const successRate =
      this.counters.totalProcessed > 0
        ? (this.counters.successCount / this.counters.totalProcessed) * 100
        : 0;

    const fallbackRate =
      this.counters.totalProcessed > 0
        ? (this.counters.fallbackCount / this.counters.totalProcessed) * 100
        : 0;

    return {
      totalProcessed: this.counters.totalProcessed,
      successCount: this.counters.successCount,
      fallbackCount: this.counters.fallbackCount,
      errorCount: this.counters.errorCount,
      emptyInputCount: this.counters.emptyInputCount,
      avgDuration,
      maxDuration,
      minDuration,
      successRate,
      fallbackRate,
    };
  }

  /**
   * Get error events from last N hours
   */
  getRecentErrors(hoursSinceEvent: number = 24): TokenizerErrorEvent[] {
    const cutoffTime = new Date(
      Date.now() - hoursSinceEvent * 60 * 60 * 1000,
    );
    return this.events.filter((e) => e.timestamp > cutoffTime);
  }

  /**
   * Log event to file with structured format
   */
  private logEvent(event: TokenizerErrorEvent): void {
    const logLine = JSON.stringify({
      timestamp: event.timestamp.toISOString(),
      jobId: event.jobId || "N/A",
      errorType: event.errorType,
      inputLength: event.inputLength,
      usedFallback: event.usedFallback,
      duration: event.duration,
      error: event.error.substring(0, 100), // Truncate long errors
    });

    try {
      fs.appendFileSync(this.logFilePath, logLine + "\n");
    } catch (err) {
      this.logger.warn(`Failed to write metrics log: ${err}`);
    }
  }

  /**
   * Print metrics summary to console
   */
  printMetrics(): void {
    const metrics = this.getMetrics();
    this.logger.log("╔════════════════════════════════════════════════════════╗");
    this.logger.log("║         EMBEDDING METRICS SUMMARY                      ║");
    this.logger.log("╠════════════════════════════════════════════════════════╣");
    this.logger.log(
      `║ Total Processed: ${metrics.totalProcessed.toString().padEnd(39)}║`,
    );
    this.logger.log(
      `║ Success: ${metrics.successCount.toString().padEnd(48)}║`,
    );
    this.logger.log(
      `║ Fallback Used: ${metrics.fallbackCount.toString().padEnd(42)}║`,
    );
    this.logger.log(
      `║ Errors: ${metrics.errorCount.toString().padEnd(49)}║`,
    );
    this.logger.log(
      `║ Empty Inputs: ${metrics.emptyInputCount.toString().padEnd(42)}║`,
    );
    this.logger.log(
      `║ Success Rate: ${metrics.successRate.toFixed(2)}%${" ".padEnd(38)}║`,
    );
    this.logger.log(
      `║ Fallback Rate: ${metrics.fallbackRate.toFixed(2)}%${" ".padEnd(37)}║`,
    );
    this.logger.log(
      `║ Avg Duration: ${metrics.avgDuration.toFixed(0)}ms${" ".padEnd(40)}║`,
    );
    this.logger.log(
      `║ Max Duration: ${metrics.maxDuration.toFixed(0)}ms${" ".padEnd(40)}║`,
    );
    this.logger.log("╚════════════════════════════════════════════════════════╝");
  }

  /**
   * Reset metrics (useful after large batch operations)
   */
  reset(): void {
    this.events = [];
    this.counters = {
      totalProcessed: 0,
      successCount: 0,
      fallbackCount: 0,
      errorCount: 0,
      emptyInputCount: 0,
    };
    this.durations = [];
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDir(logDir: string): void {
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (err) {
      this.logger.warn(`Failed to create log directory: ${err}`);
    }
  }
}

// Global instance for singleton access
let instance: EmbeddingMetricsTracker | null = null;

export function getEmbeddingMetricsTracker(): EmbeddingMetricsTracker {
  if (!instance) {
    instance = new EmbeddingMetricsTracker();
  }
  return instance;
}
