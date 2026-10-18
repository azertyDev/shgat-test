-- CreateEnum
CREATE TYPE "Holat" AS ENUM ('yuborilgan', 'hisobga_olingan', 'qaytarilgan');

-- CreateEnum
CREATE TYPE "FaylTuri" AS ENUM ('asosiy_chizma', 'tushuntirish_xati', 'tasdiqlovchi_hujjat');

-- CreateTable
CREATE TABLE "Ariza" (
    "id" SERIAL NOT NULL,
    "hujjat_nomi" VARCHAR(255) NOT NULL,
    "hujjat_turi" VARCHAR(8) NOT NULL,
    "soato_kodi" CHAR(7) NOT NULL,
    "tasdiq_sanasi" DATE NOT NULL,
    "tasdiq_hujjati" VARCHAR(100) NOT NULL,
    "chegara" JSONB NOT NULL,
    "holat" "Holat" NOT NULL DEFAULT 'yuborilgan',
    "id_raqam" VARCHAR(32),
    "arcgis_object_id" INTEGER,
    "qaytarish_sababi" TEXT,
    "yuborilgan_vaqt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ariza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fayl" (
    "id" SERIAL NOT NULL,
    "ariza_id" INTEGER NOT NULL,
    "tur" "FaylTuri" NOT NULL,
    "nomi" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "hajm" INTEGER NOT NULL,
    "yol" TEXT NOT NULL,

    CONSTRAINT "Fayl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ariza_id_raqam_key" ON "Ariza"("id_raqam");

-- CreateIndex
CREATE INDEX "Ariza_holat_idx" ON "Ariza"("holat");

-- CreateIndex
CREATE INDEX "Ariza_hujjat_turi_idx" ON "Ariza"("hujjat_turi");

-- CreateIndex
CREATE INDEX "Ariza_soato_kodi_idx" ON "Ariza"("soato_kodi");

-- CreateIndex
CREATE UNIQUE INDEX "Fayl_ariza_id_tur_key" ON "Fayl"("ariza_id", "tur");

-- AddForeignKey
ALTER TABLE "Fayl" ADD CONSTRAINT "Fayl_ariza_id_fkey" FOREIGN KEY ("ariza_id") REFERENCES "Ariza"("id") ON DELETE CASCADE ON UPDATE CASCADE;
