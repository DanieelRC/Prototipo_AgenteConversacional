-- Script para actualizar la dimensión del vector de embeddings
-- De 1536 a 768 dimensiones (tamaño real de text-embedding-004)

-- 1. Eliminar el índice HNSW existente
DROP INDEX IF EXISTS productos_embedding_idx;

-- 2. Modificar la columna embedding para aceptar 768 dimensiones
ALTER TABLE productos 
ALTER COLUMN embedding TYPE vector(768);

-- 3. Recrear el índice HNSW con la nueva dimensión
CREATE INDEX productos_embedding_idx ON productos 
USING hnsw (embedding vector_cosine_ops);

-- 4. Actualizar los embeddings existentes a NULL para forzar regeneración
UPDATE productos SET embedding = NULL;

SELECT 'Esquema actualizado correctamente. Ejecuta sync-embeddings.js para regenerar los embeddings.' as mensaje;
