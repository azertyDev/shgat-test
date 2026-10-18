#!/bin/sh
# Mounted over the image's /docker-entrypoint-initdb.d/10_postgis.sh, which would install PostGIS
# (and topology, tiger) into "public". Prisma treats spatial_ref_sys there as drift, so PostGIS is
# installed only by the migration 20261018150000_postgis, into its own "postgis" schema.
exit 0
