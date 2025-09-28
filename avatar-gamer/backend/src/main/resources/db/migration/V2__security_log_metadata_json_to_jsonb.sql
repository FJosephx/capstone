-- Si la columna existe como text, cámbiala a jsonb
ALTER TABLE security_log
ALTER COLUMN metadata_json
    TYPE jsonb
    USING CASE
        WHEN metadata_json IS NULL OR metadata_json = '' THEN NULL
        ELSE metadata_json::jsonb
END;
