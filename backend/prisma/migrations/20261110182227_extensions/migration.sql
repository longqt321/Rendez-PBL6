-- Extension phục vụ search (T2.4/T2.5): bỏ dấu tiếng Việt + khớp mờ trigram.
-- `IF NOT EXISTS` để migration chạy lại an toàn; quyền tạo extension cần superuser/CREATEDB.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
