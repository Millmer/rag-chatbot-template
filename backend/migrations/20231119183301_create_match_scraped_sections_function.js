exports.up = function(knex) {
  return knex.schema.raw(`
      CREATE OR REPLACE FUNCTION match_scraped_sections(embedding vector(1536), match_threshold float, match_count int, min_content_length int)
      RETURNS TABLE (source text, url text, heading text, content text, similarity float)
      LANGUAGE plpgsql
      AS $$
      #variable_conflict use_variable
      BEGIN
        RETURN query
        SELECT
          scraped_source.source,
          scraped_source.url,
          scraped_source_section.heading,
          scraped_source_section.content,
          (scraped_source_section.embedding <#> embedding) * -1 as similarity
        FROM scraped_source_section
        JOIN scraped_source
          ON scraped_source_section.scraped_source_id = scraped_source.id
      
        -- We only care about sections that have a useful amount of content
        WHERE LENGTH(scraped_source_section.content) >= min_content_length
      
        -- The dot product is negative, so we negate it
        AND (scraped_source_section.embedding <#> embedding) * -1 > match_threshold
      
        -- OpenAI embeddings are normalized to length 1, so
        -- cosine similarity and dot product will produce the same results.
        -- Using dot product which can be computed slightly faster.
        --
        -- For the different syntaxes, see https://github.com/pgvector/pgvector
        ORDER BY scraped_source_section.embedding <#> embedding
        
        LIMIT match_count;
      END;
      $$;
  `);
};

exports.down = function(knex) {
    return knex.schema.raw(`
        DROP FUNCTION IF EXISTS match_scraped_sections(vector(1536), float, int, int);
    `);
};