/**
 * BM25 ranking algorithm for text search.
 *
 * Ported from UI/UX Pro Max's Python implementation to TypeScript.
 * Zero-dependency, supports Chinese + English tokenization.
 */
export class BM25 {
  private readonly k1: number;
  private readonly b: number;

  private corpus: string[][] = [];
  private docLengths: number[] = [];
  private avgdl = 0;
  private idf: Map<string, number> = new Map();
  private N = 0;

  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  /**
   * Tokenize text into searchable terms.
   * Handles both Chinese characters (single-char tokens) and English words.
   */
  tokenize(text: string): string[] {
    const lower = text.toLowerCase();
    const tokens: string[] = [];

    // Extract Chinese characters as individual tokens
    const chineseChars = lower.match(/[\u4e00-\u9fff]/g);
    if (chineseChars) {
      tokens.push(...chineseChars);
    }

    // Also extract Chinese bigrams for better phrase matching
    const chineseOnly = lower.replace(/[^\u4e00-\u9fff]/g, "");
    for (let i = 0; i < chineseOnly.length - 1; i++) {
      tokens.push(chineseOnly.slice(i, i + 2));
    }

    // Extract English/alphanumeric words (length > 1)
    const englishWords = lower.replace(/[\u4e00-\u9fff]/g, " ").match(/[a-z0-9]+/g);
    if (englishWords) {
      tokens.push(...englishWords.filter((w) => w.length > 1));
    }

    return tokens;
  }

  /**
   * Build BM25 index from a list of documents (plain text strings).
   */
  fit(documents: string[]): void {
    this.corpus = documents.map((doc) => this.tokenize(doc));
    this.N = this.corpus.length;
    if (this.N === 0) return;

    this.docLengths = this.corpus.map((doc) => doc.length);
    this.avgdl = this.docLengths.reduce((a, b) => a + b, 0) / this.N;

    // Compute document frequencies
    const docFreqs = new Map<string, number>();
    for (const doc of this.corpus) {
      const seen = new Set<string>();
      for (const word of doc) {
        if (!seen.has(word)) {
          docFreqs.set(word, (docFreqs.get(word) ?? 0) + 1);
          seen.add(word);
        }
      }
    }

    // Compute IDF
    this.idf = new Map();
    for (const [word, freq] of docFreqs) {
      this.idf.set(word, Math.log((this.N - freq + 0.5) / (freq + 0.5) + 1));
    }
  }

  /**
   * Score all documents against a query.
   * Returns array of [documentIndex, score] sorted by score descending.
   */
  score(query: string): Array<[number, number]> {
    const queryTokens = this.tokenize(query);
    const results: Array<[number, number]> = [];

    for (let idx = 0; idx < this.corpus.length; idx++) {
      const doc = this.corpus[idx];
      const docLen = this.docLengths[idx];

      // Count term frequencies in this document
      const termFreqs = new Map<string, number>();
      for (const word of doc) {
        termFreqs.set(word, (termFreqs.get(word) ?? 0) + 1);
      }

      let score = 0;
      for (const token of queryTokens) {
        const idf = this.idf.get(token);
        if (idf === undefined) continue;

        const tf = termFreqs.get(token) ?? 0;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + (this.b * docLen) / this.avgdl);
        score += idf * (numerator / denominator);
      }

      results.push([idx, score]);
    }

    return results.sort((a, b) => b[1] - a[1]);
  }
}
