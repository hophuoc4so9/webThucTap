/**
 * Text preprocessing utilities to prevent tokenizer errors
 * Handles: Vietnamese characters, Unicode normalization, truncation, sanitization
 */

export class TextPreprocessor {
  /**
   * Main preprocessing pipeline
   * Applies normalization, sanitization, and truncation
   */
  static preprocess(
    text: unknown,
    maxLength: number = 2000,
  ): string {
    // Convert to string if needed
    let processed = this.toValidString(text);

    // If empty after conversion, return empty
    if (!processed || processed.length === 0) {
      return "";
    }

    // Normalize Unicode (handle Vietnamese combining characters)
    processed = this.normalizeUnicode(processed);

    // Sanitize: remove control characters, zero-width chars, etc
    processed = this.sanitize(processed);

    // Collapse whitespace
    processed = this.collapseWhitespace(processed);

    // Trim
    processed = processed.trim();

    // Truncate to max length
    if (processed.length > maxLength) {
      processed = processed.substring(0, maxLength).trim();
    }

    return processed;
  }

  /**
   * Preprocess structured job text from title, description, etc
   * Applies aggressive sanitization to prevent tokenizer crashes
   */
  static preprocessJobText(jobData: {
    id?: number;
    title?: string;
    description?: string;
    requirement?: string;
    tags?: string;
    industry?: string;
    skills?: string;
  }): string {
    // Preprocess each field with smaller limits
    const title = this.preprocess(jobData.title, 200);
    const industry = this.preprocess(jobData.industry, 100);
    const tags = this.preprocess(jobData.tags, 150);
    const skills = this.preprocess(jobData.skills, 200);
    const description = this.preprocess(jobData.description, 500);
    const requirement = this.preprocess(jobData.requirement, 500);

    // Combine fields
    const parts = [title, industry, tags, skills, description, requirement];
    const combined = parts.filter(Boolean).join(" ");

    // Final pass: ensure total length is safe for tokenization
    if (combined.length > 2000) {
      return combined.substring(0, 2000).trim();
    }

    return combined;
  }

  /**
   * Split long text into chunks for batch embedding
   * Ensures each chunk is safe for tokenization
   */
  static chunkText(
    text: string,
    chunkSize: number = 500,
    overlapSize: number = 50,
  ): string[] {
    if (!text || text.length === 0) {
      return [];
    }

    const chunks: string[] = [];
    const stride = chunkSize - overlapSize;

    for (let i = 0; i < text.length; i += stride) {
      const chunk = text.substring(i, i + chunkSize);
      const trimmed = chunk.trim();
      if (trimmed.length > 0) {
        chunks.push(trimmed);
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Validate and convert various input types to valid string
   */
  private static toValidString(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }

    return "";
  }

  /**
   * Normalize Unicode characters
   * Decomposes combining characters (useful for Vietnamese diacritics)
   */
  private static normalizeUnicode(text: string): string {
    try {
      // NFD = decomposed form (fixes combining character issues)
      // NFC = composed form (alternative, fewer bytes)
      // Use NFD to break apart problematic combining chars
      return text.normalize("NFD");
    } catch {
      // If normalization fails, return original
      return text;
    }
  }

  /**
   * Sanitize: remove problematic characters
   * Removes: zero-width chars, control chars, emoji sequences (partial)
   */
  private static sanitize(text: string): string {
    // Remove zero-width characters
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

    // Remove control characters (keep only printable + common whitespace)
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, "");

    // Remove excessive emoji sequences (optional, helps with weird tokenizer inputs)
    // This removes emoji and other rare unicode blocks, but keeps regular chars
    text = text.replace(/[\p{So}\p{Sk}\p{Cc}\p{Cf}]/gu, " ");

    return text;
  }

  /**
   * Collapse multiple spaces/tabs/newlines into single space
   */
  private static collapseWhitespace(text: string): string {
    // Replace all whitespace sequences with single space
    return text.replace(/\s+/g, " ");
  }

  /**
   * Check if text is worth processing (not empty/whitespace-only)
   */
  static isValidText(text: string): boolean {
    if (!text || typeof text !== "string") {
      return false;
    }

    const trimmed = text.trim();
    return trimmed.length > 0;
  }

  /**
   * Estimate token count (rough approximation for multilingual-e5 model)
   * Actual tokenization is complex, this is just a heuristic
   */
  static estimateTokenCount(text: string): number {
    if (!text) {
      return 0;
    }

    // Rough heuristic: ~1 token per 4 characters for English
    // Vietnamese is more complex, use ~1 token per 3 characters
    // This is a rough estimate to avoid hitting token limits (512 max for model)
    return Math.ceil(text.length / 3);
  }

  /**
   * Truncate text to token budget with safety margin
   * Ensures text fits in model's max_length (512 tokens)
   */
  static truncateToTokenBudget(
    text: string,
    maxTokens: number = 500,
    safetyMargin: number = 50,
  ): string {
    const estimatedTokens = this.estimateTokenCount(text);
    const tokenBudget = maxTokens - safetyMargin;

    if (estimatedTokens <= tokenBudget) {
      return text;
    }

    // Rough reverse calculation: chars per token
    const charsPerToken = text.length / estimatedTokens;
    const maxChars = Math.floor(tokenBudget * charsPerToken);

    if (maxChars <= 0) {
      return text.substring(0, 100);
    }

    return text.substring(0, maxChars).trim();
  }
}
