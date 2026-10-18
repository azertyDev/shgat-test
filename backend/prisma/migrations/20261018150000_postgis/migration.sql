-- PostGIS for server-side geometry validity checks (ST_IsValidReason).
-- Installed in its own schema, so its tables (spatial_ref_sys) stay out of the Prisma-managed public schema.
CREATE SCHEMA IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA postgis;
