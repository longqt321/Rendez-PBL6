from django.contrib.postgres.indexes import GistIndex
from django.db import migrations


def enable_postgres_features(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
            cursor.execute("""
            CREATE OR REPLACE FUNCTION f_unaccent(text)
            RETURNS text AS $$
              SELECT public.unaccent('public.unaccent'::regdictionary, $1);
            $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
            """)
            cursor.execute("""
            CREATE INDEX IF NOT EXISTS place_search_trgm_idx ON places_place USING gin (
              f_unaccent(lower(name || ' ' || address || ' ' || coalesce(description, ''))) gin_trgm_ops
            );
            """)


def drop_postgres_features(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("DROP INDEX IF EXISTS place_search_trgm_idx;")
            cursor.execute("DROP FUNCTION IF EXISTS f_unaccent(text);")


class Migration(migrations.Migration):
    dependencies = [
        ("places", "0005_place_source_url_place_verified_at"),
    ]

    operations = [
        migrations.RunPython(enable_postgres_features, drop_postgres_features),
        migrations.AddIndex(
            model_name="place",
            index=GistIndex(fields=["latitude", "longitude"], name="place_coords_gist_idx"),
        ),
    ]
