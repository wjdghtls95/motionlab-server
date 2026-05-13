import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1746000000000 implements MigrationInterface {
  name = 'InitSchema1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sports\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`update_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`sport_type\` varchar(50) NOT NULL,
        \`sub_category\` varchar(255) NOT NULL DEFAULT 'NONE',
        \`description\` text NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_sports_sport_type_sub_category\` (\`sport_type\`, \`sub_category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`update_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`email\` varchar(255) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`name\` varchar(255) NULL,
        \`role\` enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_USER_EMAIL\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`motions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`create_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`update_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`user_id\` int NOT NULL,
        \`sport_id\` int NOT NULL,
        \`storage_type\` enum('local','s3') NOT NULL DEFAULT 'local',
        \`status\` enum('uploaded','processing','retrying','completed','failed') NOT NULL DEFAULT 'uploaded',
        \`overall_score\` int NULL,
        \`video_key\` varchar(500) NOT NULL,
        \`error_code\` varchar(30) NULL,
        \`error_message\` text NULL,
        \`completed_at\` timestamp NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`deactivated_at\` timestamp NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_motions_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_motions_sport_id\` FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`motions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`sports\``);
  }
}
