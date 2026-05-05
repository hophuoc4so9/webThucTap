import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import axios from "axios";
import { TextPreprocessor } from "../utils/text-preprocessing";
import {
  getEmbeddingMetricsTracker,
  EmbeddingMetricsTracker,
} from "../utils/embedding-metrics";

// Type for embedding provider result
export interface EmbeddingResult {
  jobId: number;
  embedding: number[];
  model: string;
  generatedAt: Date;
}

// Abstract provider interface
interface IEmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  isReady(): Promise<boolean>;
}

/**
 * Local Embedding Provider using @xenova/transformers
 * Downloads model once, runs inference locally without API calls
 */
class LocalEmbeddingProvider implements IEmbeddingProvider {
  private model: any = null;
  private modelName = "Xenova/multilingual-e5-small";
  private logger = new Logger("LocalEmbeddingProvider");
  private fallbackDim = 384;
  private warnedTokenizerFallback = false;
  private metricsTracker = getEmbeddingMetricsTracker();

  private buildModelInput(
    text: unknown,
    prefix: "query" | "passage",
  ): string | null {
    let raw = "";

    if (typeof text === "string") {
      raw = text;
    } else if (typeof text === "number" || typeof text === "boolean") {
      raw = String(text);
    } else {
      return null;
    }

    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return null;
    }

    return `${prefix}: ${cleaned}`;
  }

  private isTokenizerError(error: any): boolean {
    if (!error || typeof error.message !== "string") {
      return false;
    }
    const message = error.message;
    // Detect various tokenizer-related errors
    return (
      message.includes("reading 'length'") ||
      message.includes("Cannot read") ||
      message.includes("tokenizer") ||
      message.includes("tokens") ||
      message.includes("undefined") ||
      message.includes("null")
    );
  }

  private generateFallbackEmbedding(seedText: string): number[] {
    let hash = 0;
    for (let i = 0; i < seedText.length; i++) {
      hash = (hash << 5) - hash + seedText.charCodeAt(i);
      hash |= 0;
    }

    const embedding: number[] = [];
    for (let i = 0; i < this.fallbackDim; i++) {
      embedding.push(Math.sin(hash + i * 0.37));
    }

    const norm = Math.sqrt(
      embedding.reduce((sum, value) => sum + value * value, 0),
    );
    if (!norm) {
      return new Array(this.fallbackDim).fill(0);
    }

    return embedding.map((value) => value / norm);
  }

  async initialize(): Promise<void> {
    try {
      // Lazy load transformers to avoid issues in environments where it's not needed
      const { pipeline } = await import("@xenova/transformers");
      this.logger.log(`Initializing local model: ${this.modelName}`);
      this.logger.warn(
        "First run will download model (~1.5GB). This may take 5-10 minutes.",
      );

      // Create pipeline - automatically downloads model on first use
      this.model = await pipeline("feature-extraction", this.modelName);
      this.logger.log("✓ Model loaded successfully");
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize local model: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
  async generatePassageEmbedding(text: string): Promise<number[]> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    const startTime = performance.now();
    let preprocessedText = "";

    try {
      // Step 1: Preprocess text to remove problematic characters
      preprocessedText = TextPreprocessor.preprocess(text);

      if (!preprocessedText) {
        this.metricsTracker.recordEmptyInput();
        return [];
      }

      const input = this.buildModelInput(preprocessedText, "passage");
      if (!input) {
        this.metricsTracker.recordEmptyInput();
        throw new Error("Passage text is empty after preprocessing");
      }

      const output = await this.model(input, {
        pooling: "mean",
        normalize: true,
        truncation: true,
        max_length: 512,
      });

      if (!output || !output.data) {
        this.metricsTracker.recordError(
          undefined,
          "Model returned empty output",
          "tokenizer_other",
          performance.now() - startTime,
          preprocessedText.length,
        );
        return [];
      }

      const duration = performance.now() - startTime;
      this.metricsTracker.recordSuccess(undefined, duration, preprocessedText.length);
      return Array.from(output.data);
    } catch (error: any) {
      const duration = performance.now() - startTime;

      if (this.isTokenizerError(error)) {
        // Log tokenizer error and use fallback
        if (!this.warnedTokenizerFallback) {
          this.logger.warn(
            "Tokenizer error detected. Using preprocessing + fallback strategy for problematic inputs.",
          );
          this.warnedTokenizerFallback = true;
        }

        const errorType = error.message?.includes("reading 'length'")
          ? "tokenizer_length"
          : "tokenizer_other";

        this.metricsTracker.recordFallback(
          undefined,
          error.message || "Unknown tokenizer error",
          errorType,
          duration,
          preprocessedText.length,
        );
        return this.generateFallbackEmbedding(preprocessedText || "passage");
      }

      this.logger.error(
        `Failed to generate passage embedding: ${error.message}`,
      );
      this.metricsTracker.recordError(
        undefined,
        error.message || "Unknown error",
        "tokenizer_other",
        duration,
        preprocessedText.length,
      );
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    const startTime = performance.now();
    let preprocessedText = "";

    try {
      // Step 1: Preprocess text
      preprocessedText = TextPreprocessor.preprocess(text);

      if (!preprocessedText) {
        this.metricsTracker.recordEmptyInput();
        return [];
      }

      const input = this.buildModelInput(preprocessedText, "query");
      if (!input) {
        this.metricsTracker.recordEmptyInput();
        throw new Error("Query text is empty after preprocessing");
      }

      const output = await this.model(input, {
        pooling: "mean",
        normalize: true,
        truncation: true,
        max_length: 512,
      });

      if (!output || !output.data) {
        this.metricsTracker.recordError(
          undefined,
          "Model returned empty output",
          "tokenizer_other",
          performance.now() - startTime,
          preprocessedText.length,
        );
        return [];
      }

      const duration = performance.now() - startTime;
      this.metricsTracker.recordSuccess(undefined, duration, preprocessedText.length);
      return Array.from(output.data);
    } catch (error: any) {
      const duration = performance.now() - startTime;

      if (this.isTokenizerError(error)) {
        if (!this.warnedTokenizerFallback) {
          this.logger.warn(
            "Tokenizer error detected. Using preprocessing + fallback strategy for problematic inputs.",
          );
          this.warnedTokenizerFallback = true;
        }

        const errorType = error.message?.includes("reading 'length'")
          ? "tokenizer_length"
          : "tokenizer_other";

        this.metricsTracker.recordFallback(
          undefined,
          error.message || "Unknown tokenizer error",
          errorType,
          duration,
          preprocessedText.length,
        );
        return this.generateFallbackEmbedding(preprocessedText || "query");
      }

      this.logger.error(`Failed to generate embedding: ${error.message}`);
      this.metricsTracker.recordError(
        undefined,
        error.message || "Unknown error",
        "tokenizer_other",
        duration,
        preprocessedText.length,
      );
      throw error;
    }
  }
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }

    try {
      const embeddings: number[][] = [];

      // FIX: Bỏ Promise.all, bắt buộc phải chạy tuần tự để ONNX Runtime không bị crash memory
      for (let i = 0; i < texts.length; i++) {
        try {
          const input = this.buildModelInput(texts[i], "passage");
          if (!input) {
            this.logger.warn(
              `Bo qua text rong trong batch (index=${i})`,
            );
            embeddings.push([]);
            continue;
          }

          const output = await this.model(input, {
            pooling: "mean",
            normalize: true,
            truncation: true,
            max_length: 512,
          });
          embeddings.push(output && output.data ? Array.from(output.data) : []);
        } catch (err: any) {
          if (this.isTokenizerError(err)) {
            if (!this.warnedTokenizerFallback) {
              this.logger.log(
                "Local tokenizer failed on some inputs, using fallback embedding for affected records",
              );
              this.warnedTokenizerFallback = true;
            }
            embeddings.push(this.generateFallbackEmbedding(texts[i] || "batch"));
            continue;
          }
          this.logger.warn(`Bỏ qua 1 text bị lỗi trong batch: ${err.message}`);
          embeddings.push([]); // Trả về mảng rỗng để không làm lệch index của batch
        }
      }

      return embeddings;
    } catch (error: any) {
      this.logger.error(`Failed to generate batch embeddings: ${error.message}`);
      throw error;
    }
  }
  async isReady(): Promise<boolean> {
    return this.model !== null;
  }
}

/**
 * Hugging Face API Provider
 * Uses Hugging Face Inference API (requires token)
 */
class HuggingFaceAPIProvider implements IEmbeddingProvider {
  private apiUrl =
    "https://api-inference.huggingface.co/pipeline/feature-extraction";
  private apiKey: string;
  private modelName = "Xenova/multilingual-e5-small";
  private logger = new Logger("HuggingFaceAPIProvider");

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (!apiKey) {
      throw new Error("HUGGING_FACE_API_KEY is required for API provider");
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.modelName}`,
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        },
      );

      if (Array.isArray(response.data) && response.data.length > 0) {
        const embedding = response.data[0];
        return Array.isArray(embedding) ? embedding : [embedding];
      }
      throw new Error("Invalid response from Hugging Face API");
    } catch (error: any) {
      this.logger.error(`API call failed: ${error.message}`);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.modelName}`,
        { inputs: texts },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        },
      );

      return response.data.map((emb: any) =>
        Array.isArray(emb) ? emb : [emb],
      );
    } catch (error: any) {
      this.logger.error(`Batch API call failed: ${error.message}`);
      throw error;
    }
  }

  async isReady(): Promise<boolean> {
    return true; // API is always ready if we have a key
  }
}

/**
 * EmbeddingService: Flexible embedding provider supporting both local and API modes
 *
 * Usage:
 * - LOCAL MODE (Recommended for dev/production):
 *   EMBEDDING_PROVIDER=local
 *   First run downloads model (~1.5GB), subsequent runs use cached model
 *
 * - API MODE (For testing without model download):
 *   EMBEDDING_PROVIDER=huggingface-api
 *   HUGGING_FACE_API_KEY=hf_...
 */
@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private provider: IEmbeddingProvider | null = null;
  private embeddingDim = 384; // multilingual-e5-large dimension
  private providerType: "local" | "huggingface-api" | "mock" =
    (process.env.EMBEDDING_PROVIDER as any) || "local";
  private metricsTracker = getEmbeddingMetricsTracker();

  async onModuleInit(): Promise<void> {
    await this.initializeProvider();
    this.logger.log(
      "EmbeddingService initialized with text preprocessing and metrics tracking enabled",
    );
  }

  /**
   * Get current embedding metrics
   */
  getMetrics() {
    return this.metricsTracker.getMetrics();
  }

  /**
   * Print metrics summary to logs
   */
  printMetrics(): void {
    this.metricsTracker.printMetrics();
  }

  private async initializeProvider(): Promise<void> {
    this.logger.log(`Initializing embedding provider: ${this.providerType}`);

    try {
      switch (this.providerType) {
        case "local":
          const localProvider = new LocalEmbeddingProvider();
          await localProvider.initialize();
          this.provider = localProvider;
          break;

        case "huggingface-api":
          this.provider = new HuggingFaceAPIProvider(
            process.env.HUGGING_FACE_API_KEY || "",
          );
          break;

        case "mock":
          this.logger.warn(
            "Using MOCK embeddings (for testing only). Install local model for production.",
          );
          this.provider = null; // Will fall back to mock
          break;

        default:
          this.logger.warn(
            `Unknown provider ${this.providerType}, falling back to mock`,
          );
          this.provider = null;
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize provider: ${error.message}, falling back to mock`,
      );
      this.provider = null;
    }
  }

  /**
   * Generate embedding for a job based on its text fields
   */
  async generateJobEmbedding(jobData: {
    id: number;
    title: string;
    description?: string;
    requirement?: string;
    tags?: string;
    industry?: string;
    skills?: string;
  }): Promise<EmbeddingResult> {
    try {
      const text = this.buildJobText(jobData);
      let embedding: number[];

      if (!text || text.trim().length === 0) {
        this.metricsTracker.recordEmptyInput(jobData.id);
        throw new Error("Job text is empty, cannot generate embedding");
      }

      if (
        this.provider &&
        this.provider instanceof LocalEmbeddingProvider
      ) {
        embedding = await this.provider.generatePassageEmbedding(text);
      } else if (this.provider) {
        embedding = await this.provider.generateEmbedding(
          `passage: ${text}`,
        );
      } else {
        embedding = this.generateMockEmbedding(text);
      }

      if (!embedding || embedding.length === 0) {
        throw new Error("Provider returned empty embedding");
      }

      return {
        jobId: jobData.id,
        embedding,
        model: `${this.providerType}-multilingual-e5-small`,
        generatedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Error for Job #${jobData.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embedding for a search query
   */
  async generateQueryEmbedding(text: string): Promise<number[]> {
    try {
      if (this.provider) {
        return await this.provider.generateEmbedding(text);
      }

      return this.generateMockEmbedding(text);
    } catch (error: any) {
      this.logger.error(
        `Failed to generate query embedding: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Batch generate embeddings for multiple jobs
   */
  async generateBatchEmbeddings(
    jobs: any[],
  ): Promise<EmbeddingResult[]> {
    const results = [];

    if (this.provider) {
      // Use batch API if available
      try {
        const texts = jobs.map((j) => this.buildJobText(j));
        const embeddings =
          await this.provider.generateBatchEmbeddings(texts);

        return embeddings.map((emb, idx) => ({
          jobId: jobs[idx].id,
          embedding: emb,
          model: `${this.providerType}-multilingual-e5-large`,
          generatedAt: new Date(),
        }));
      } catch (error: any) {
        this.logger.warn(
          `Batch API failed, falling back to individual: ${error.message}`,
        );
      }
    }

    // Fallback: process individually
    for (const job of jobs) {
      try {
        const result = await this.generateJobEmbedding(job);
        results.push(result);
      } catch (error: any) {
        this.logger.warn(
          `Failed to embed job #${job.id}, skipping: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Batch embedding completed: ${results.length}/${jobs.length} succeeded`,
    );
    return results;
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Embedding dimensions must match");
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }

  /**
   * Serialize embedding to Buffer for storage in DB
   */
  serializeEmbedding(embedding: number[]): Buffer {
    const buffer = Buffer.allocUnsafe(embedding.length * 4);
    for (let i = 0; i < embedding.length; i++) {
      buffer.writeFloatLE(embedding[i], i * 4);
    }
    return buffer;
  }

  /**
   * Deserialize embedding from Buffer
   */
  deserializeEmbedding(buffer: Buffer): number[] {
    const embedding = [];
    for (let i = 0; i < buffer.length / 4; i++) {
      embedding.push(buffer.readFloatLE(i * 4));
    }
    return embedding;
  }

  // ─── Private Helpers ───────────────────────────────

  private buildJobText(jobData: {
    id: number;
    title: string;
    description?: string;
    requirement?: string;
    tags?: string;
    industry?: string;
    skills?: string;
  }): string {
    // Use TextPreprocessor for comprehensive text preprocessing
    return TextPreprocessor.preprocessJobText(jobData);
  }

  /**
   * FALLBACK: Generate mock embedding from text
   */
  private generateMockEmbedding(text: string): number[] {
    const seed = this.hashString(text);
    const embedding: number[] = [];

    for (let i = 0; i < this.embeddingDim; i++) {
      const value = Math.sin(seed + i * 0.5) * 0.5 + 0.5;
      embedding.push((value - 0.5) * 2);
    }

    const norm = Math.sqrt(
      embedding.reduce((sum, v) => sum + v * v, 0),
    );
    return embedding.map((v) => v / norm);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
