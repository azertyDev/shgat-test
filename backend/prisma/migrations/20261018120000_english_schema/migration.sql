-- Rename the schema to English. Only renames: existing rows are kept.

-- Enums
ALTER TYPE "Holat" RENAME TO "application_status";
ALTER TYPE "application_status" RENAME VALUE 'yuborilgan' TO 'SUBMITTED';
ALTER TYPE "application_status" RENAME VALUE 'hisobga_olingan' TO 'REGISTERED';
ALTER TYPE "application_status" RENAME VALUE 'qaytarilgan' TO 'RETURNED';

ALTER TYPE "FaylTuri" RENAME TO "file_kind";
ALTER TYPE "file_kind" RENAME VALUE 'asosiy_chizma' TO 'MAIN_DRAWING';
ALTER TYPE "file_kind" RENAME VALUE 'tushuntirish_xati' TO 'EXPLANATORY_NOTE';
ALTER TYPE "file_kind" RENAME VALUE 'tasdiqlovchi_hujjat' TO 'APPROVAL_DOCUMENT';

-- applications
ALTER TABLE "Ariza" RENAME TO "applications";
ALTER TABLE "applications" RENAME COLUMN "hujjat_nomi" TO "document_name";
ALTER TABLE "applications" RENAME COLUMN "hujjat_turi" TO "document_type";
ALTER TABLE "applications" RENAME COLUMN "soato_kodi" TO "soato_code";
ALTER TABLE "applications" RENAME COLUMN "tasdiq_sanasi" TO "approval_date";
ALTER TABLE "applications" RENAME COLUMN "tasdiq_hujjati" TO "approval_decree";
ALTER TABLE "applications" RENAME COLUMN "chegara" TO "boundary";
ALTER TABLE "applications" RENAME COLUMN "holat" TO "status";
ALTER TABLE "applications" RENAME COLUMN "id_raqam" TO "registration_number";
ALTER TABLE "applications" RENAME COLUMN "arcgis_urinish_vaqti" TO "arcgis_attempt_at";
ALTER TABLE "applications" RENAME COLUMN "qaytarish_sababi" TO "return_reason";
ALTER TABLE "applications" RENAME COLUMN "yuborilgan_vaqt" TO "submitted_at";
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
ALTER INDEX "Ariza_pkey" RENAME TO "applications_pkey";
ALTER INDEX "Ariza_id_raqam_key" RENAME TO "applications_registration_number_key";
ALTER INDEX "Ariza_holat_idx" RENAME TO "applications_status_idx";
ALTER INDEX "Ariza_hujjat_turi_idx" RENAME TO "applications_document_type_idx";
ALTER INDEX "Ariza_soato_kodi_idx" RENAME TO "applications_soato_code_idx";
ALTER SEQUENCE "Ariza_id_seq" RENAME TO "applications_id_seq";

-- application_files
ALTER TABLE "Fayl" RENAME TO "application_files";
ALTER TABLE "application_files" RENAME COLUMN "ariza_id" TO "application_id";
ALTER TABLE "application_files" RENAME COLUMN "tur" TO "kind";
ALTER TABLE "application_files" RENAME COLUMN "nomi" TO "original_name";
ALTER TABLE "application_files" RENAME COLUMN "mime" TO "mime_type";
ALTER TABLE "application_files" RENAME COLUMN "hajm" TO "size";
ALTER TABLE "application_files" RENAME COLUMN "yol" TO "storage_path";
ALTER INDEX "Fayl_pkey" RENAME TO "application_files_pkey";
ALTER INDEX "Fayl_ariza_id_tur_key" RENAME TO "application_files_application_id_kind_key";
ALTER TABLE "application_files" RENAME CONSTRAINT "Fayl_ariza_id_fkey" TO "application_files_application_id_fkey";
ALTER SEQUENCE "Fayl_id_seq" RENAME TO "application_files_id_seq";
