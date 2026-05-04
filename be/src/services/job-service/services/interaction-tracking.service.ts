import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  UserJobInteraction,
  InteractionType,
} from "../entities/user-job-interaction.entity";
import { JobEmbeddingQueue, EmbeddingStatus } from "../entities/job-embedding-queue.entity";
import { Job } from "../entities/job.entity";

export interface TrackInteractionParams {
  userId: number;
  jobId: number;
  type: InteractionType;
  metadata?: Record<string, any>;
}

@Injectable()
export class InteractionTrackingService {
  constructor(
    @InjectRepository(UserJobInteraction)
    private interactionRepo: Repository<UserJobInteraction>,
    @InjectRepository(JobEmbeddingQueue)
    private embeddingQueueRepo: Repository<JobEmbeddingQueue>,
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
  ) {}

  /**
   * Track a user-job interaction (click, view, apply, save)
   * Updates job metrics (viewsCount, applyCount, popularityScore)
   * Enqueues job for re-embedding if significant metric change
   */
  async trackInteraction(params: TrackInteractionParams): Promise<void> {
    const { userId, jobId, type, metadata } = params;

    // Calculate weight based on interaction type
    const weights = {
      [InteractionType.CLICK]: 0.5,
      [InteractionType.VIEW]: 1,
      [InteractionType.SAVE]: 2,
      [InteractionType.APPLY]: 3,
    };

    const weight = weights[type] || 1;

    // Record interaction
    await this.interactionRepo.save({
      userId,
      jobId,
      type,
      weight,
      metadata,
    });

    // Update job metrics
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (job) {
      if (type === InteractionType.VIEW) {
        job.viewsCount = (job.viewsCount || 0) + 1;
      } else if (type === InteractionType.APPLY) {
        job.applyCount = (job.applyCount || 0) + 1;
      }

      // Recalculate popularity score: views * 0.1 + applies * 0.5 + recency boost
      const ageInHours = Date.now() - (job.indexedAt?.getTime() || Date.now());
      const recencyBoost = Math.exp(-ageInHours / (7 * 24 * 3600 * 1000)); // decay over 1 week
      job.popularityScore =
        (job.viewsCount || 0) * 0.1 +
        (job.applyCount || 0) * 0.5 +
        recencyBoost * 0.5;

      await this.jobRepo.save(job);

      // Enqueue for re-embedding if popularity score changed significantly
      await this.enqueueJobIfNeeded(jobId);
    }
  }

  /**
   * Enqueue a job for embedding if not already queued
   */
  async enqueueJobIfNeeded(jobId: number): Promise<void> {
    const existing = await this.embeddingQueueRepo.findOne({
      where: { jobId, status: EmbeddingStatus.PENDING },
    });
    if (!existing) {
      await this.embeddingQueueRepo.save({
        jobId,
        status: EmbeddingStatus.PENDING,
        attempts: 0,
      });
    }
  }

  /**
   * Get user interaction history for a specific job
   */
  async getJobInteractions(
    jobId: number,
    limit = 100,
  ): Promise<UserJobInteraction[]> {
    return this.interactionRepo.find({
      where: { jobId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Get user's interaction history (all jobs)
   */
  async getUserInteractions(
    userId: number,
    limit = 100,
  ): Promise<UserJobInteraction[]> {
    return this.interactionRepo.find({
      where: { userId },
      relations: ["job"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Get weighted interaction score between user and job (for collaborative filtering)
   */
  async getUserJobScore(userId: number, jobId: number): Promise<number> {
    const interactions = await this.interactionRepo.find({
      where: { userId, jobId },
    });
    return interactions.reduce((sum, i) => sum + i.weight, 0);
  }

  /**
   * Get jobs interacted with by user (for collaborative filtering neighbor finding)
   */
  async getUserInteractedJobs(userId: number, limit = 50): Promise<Job[]> {
    const interactions = await this.interactionRepo.find({
      where: { userId },
      relations: ["job"],
      order: { createdAt: "DESC" },
      take: limit,
    });
    return interactions.map((i) => i.job);
  }

  /**
   * Get pending embeddings from queue
   */
  async getPendingEmbeddings(
    limit = 50,
  ): Promise<JobEmbeddingQueue[]> {
    return this.embeddingQueueRepo.find({
      where: { status: EmbeddingStatus.PENDING },
      relations: ["job"],
      take: limit,
    });
  }

  /**
   * Mark embedding as processing
   */
  async markAsProcessing(queueId: number): Promise<void> {
    await this.embeddingQueueRepo.update(queueId, {
      status: EmbeddingStatus.PROCESSING,
      lastAttemptAt: new Date(),
    });
  }

  /**
   * Mark embedding as complete
   */
  async markAsComplete(queueId: number): Promise<void> {
    await this.embeddingQueueRepo.update(queueId, {
      status: EmbeddingStatus.SUCCESS,
    });
  }

  /**
   * Mark embedding as failed with error message
   */
  async markAsFailed(
    queueId: number,
    error: string,
    maxRetries = 3,
  ): Promise<void> {
    const queue = await this.embeddingQueueRepo.findOne({
      where: { id: queueId },
    });
    if (queue) {
      const attempts = (queue.attempts || 0) + 1;
      const status =
        attempts >= maxRetries
          ? EmbeddingStatus.FAILED
          : EmbeddingStatus.PENDING;
      await this.embeddingQueueRepo.update(queueId, {
        status,
        attempts,
        errorMessage: error,
        lastAttemptAt: new Date(),
      });
    }
  }
}
