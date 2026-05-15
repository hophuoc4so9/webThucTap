import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateSkillClusters1715859600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create skill_clusters table
    await queryRunner.createTable(
      new Table({
        name: "skill_clusters",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "cluster_name",
            type: "text",
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "scope",
            type: "varchar",
            length: "20",
            isNullable: false,
            default: "'global'",
          },
          {
            name: "scope_context",
            type: "varchar",
            length: "200",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            length: "20",
            isNullable: false,
            default: "'active'",
          },
          {
            name: "merged_into_cluster_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true, // ifNotExists
    );

    // Create indexes
    await queryRunner.createIndex(
      "skill_clusters",
      new TableIndex({
        name: "IDX_skill_clusters_scope_context",
        columnNames: ["scope", "scope_context"],
      }),
    );

    await queryRunner.createIndex(
      "skill_clusters",
      new TableIndex({
        name: "IDX_skill_clusters_status",
        columnNames: ["status"],
      }),
    );

    // Create junction table for skill_cluster_terms
    await queryRunner.createTable(
      new Table({
        name: "skill_cluster_terms",
        columns: [
          {
            name: "cluster_id",
            type: "int",
            isNullable: false,
            isPrimary: true,
          },
          {
            name: "skill_term_id",
            type: "int",
            isNullable: false,
            isPrimary: true,
          },
        ],
        indices: [
          {
            name: "IDX_skill_cluster_terms_cluster_id",
            columnNames: ["cluster_id"],
          },
          {
            name: "IDX_skill_cluster_terms_skill_term_id",
            columnNames: ["skill_term_id"],
          },
        ],
      }),
      true, // ifNotExists
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      "skill_cluster_terms",
      new TableForeignKey({
        columnNames: ["cluster_id"],
        referencedTableName: "skill_clusters",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "skill_cluster_terms",
      new TableForeignKey({
        columnNames: ["skill_term_id"],
        referencedTableName: "skill_terms",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable("skill_cluster_terms");
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey("skill_cluster_terms", foreignKey);
      }
    }

    // Drop junction table
    await queryRunner.dropTable("skill_cluster_terms", true);

    // Drop skill_clusters table
    await queryRunner.dropTable("skill_clusters", true);
  }
}
