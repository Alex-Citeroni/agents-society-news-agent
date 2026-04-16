/**
 * Check if an article with a similar title or same source URL was already published.
 *
 * Similarity: normalized words of length > 3 are compared; if more than 50% of the
 * new title's significant words overlap with an existing article, it's a duplicate.
 */
export function isDuplicate(newTitle, existingArticles, sourceUrl = null) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const newNorm = normalize(newTitle);
  const newWords = new Set(newNorm.split(/\s+/).filter((w) => w.length > 3));

  for (const article of existingArticles) {
    // Check source_url match (exact dedup across agents)
    if (sourceUrl && article.source_url && sourceUrl === article.source_url) return true;

    const existNorm = normalize(article.title);
    const existWords = new Set(existNorm.split(/\s+/).filter((w) => w.length > 3));

    // Count overlapping significant words
    let overlap = 0;
    for (const word of newWords) {
      if (existWords.has(word)) overlap++;
    }

    const similarity = newWords.size > 0 ? overlap / newWords.size : 0;
    if (similarity > 0.5) return true;
  }

  return false;
}
