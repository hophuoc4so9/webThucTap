import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "../entities/job.entity";
import { JobSkillMention, MentionSource } from "../entities/job-skill-mention.entity";
import { SkillExtractionService, ExtractedSkillItem } from "./skill-extraction.service";
import { SkillDictionaryService } from "./skill-dictionary.service";

/**
 * SkillMigrationService — re-extract skills cho toàn bộ jobs.
 *
 * Chạy sau khi deploy hệ thống mới hoặc khi admin duyệt batch lớn.
 * Tạo JobSkillMention records + cập nhật extractedSkills string[] cũ.
 */
@Injectable()
export class SkillMigrationService {
  private readonly logger = new Logger(SkillMigrationService.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobSkillMention)
    private readonly mentionRepo: Repository<JobSkillMention>,
    private readonly skillExtraction: SkillExtractionService,
    private readonly dictionary: SkillDictionaryService,
  ) {}

  /**
   * Re-extract skills cho toàn bộ (hoặc subset) jobs.
   * Tạo JobSkillMention records + cập nhật extractedSkills string[] cũ (backward compat).
   * Đồng thời upsert pending candidates vào SkillTerm.
   */
  async reExtractAll(options?: {
    batchSize?: number;
    fromId?: number;
    majorGroup?: string;
    dryRun?: boolean;
  }): Promise<{ processed: number; mentions: number; candidates: number; errors: number }> {
    const batchSize = options?.batchSize ?? this.BATCH_SIZE;
    let processed = 0;
    let totalMentions = 0;
    let totalCandidates = 0;
    let errors = 0;
    let lastId = options?.fromId ?? 0;

    this.logger.log(`Starting re-extraction from job #${lastId}, batch=${batchSize}`);

    while (true) {
      const qb = this.jobRepo.createQueryBuilder("job");
      qb.select([
        "job.id", "job.title", "job.description", "job.requirement",
        "job.tagsRequirement", "job.industry", "job.field",
        "job.nhom", "job.nganhHoc",
      ]);
      qb.where("job.id > :lastId", { lastId });

      if (options?.majorGroup) {
        qb.andWhere(":majorGroup = ANY(job.nhom)", { majorGroup: options.majorGroup });
      }

      qb.orderBy("job.id", "ASC");
      qb.limit(batchSize);

      const jobs = await qb.getMany();
      if (!jobs.length) break;

      for (const job of jobs) {
        try {
          const majorGroup = job.nhom?.[0] ?? null;
          const major = job.nganhHoc?.[0] ?? null;

          const items = this.skillExtraction.extractSkillsV2(
            {
              title: job.title,
              description: job.description,
              requirement: job.requirement,
              tagsRequirement: job.tagsRequirement,
              industry: job.industry,
              field: job.field,
            },
            { major: major ?? undefined, majorGroup: majorGroup ?? undefined },
          );

          if (!options?.dryRun) {
            // Delete old mentions for this job
            await this.mentionRepo.delete({ jobId: job.id });

            // Insert new mentions
            if (items.length > 0) {
              const mentions = items.map((item) =>
                this.mentionRepo.create({
                  jobId: job.id,
                  canonicalName: item.canonicalName,
                  rawText: item.rawText,
                  type: item.type,
                  category: item.category,
                  confidence: item.confidence,
                  source: item.source,
                  major: item.major ?? major,
                  majorGroup: item.majorGroup ?? majorGroup,
                }),
              );

              await this.mentionRepo.save(mentions);
              totalMentions += mentions.length;
            }

            // Update legacy extractedSkills field (backward compat)
            const skillNames = items
              .filter((i) => i.type !== "noise")
              .map((i) => i.canonicalName);

            await this.jobRepo.update(job.id, {
              extractedSkills: skillNames.length > 0 ? skillNames : null,
              skillsExtractedAt: new Date(),
            } as Partial<Job>);

            // Upsert pending candidates to dictionary
            for (const item of items.filter((i) => i.dictionaryStatus === "pending")) {
              await this.dictionary.upsertCandidate({
                rawText: item.rawText,
                normalizedText: item.normalizedText,
                canonicalName: item.canonicalName,
                type: item.type,
                category: item.category,
                confidence: item.confidence,
                major: item.major ?? major,
                majorGroup: item.majorGroup ?? majorGroup,
                jobId: job.id,
              });
              totalCandidates++;
            }
          }

          processed++;
        } catch (error: any) {
          this.logger.warn(`Error processing job #${job.id}: ${error?.message ?? error}`);
          errors++;
        }
      }

      lastId = jobs[jobs.length - 1].id;
      this.logger.log(`Processed ${processed} jobs, lastId=${lastId}, mentions=${totalMentions}, candidates=${totalCandidates}`);
    }

    this.logger.log(
      `Re-extraction complete: ${processed} jobs, ${totalMentions} mentions, ${totalCandidates} candidates, ${errors} errors`,
    );

    return { processed, mentions: totalMentions, candidates: totalCandidates, errors };
  }
}
