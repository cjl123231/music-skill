import { describe, expect, it } from "vitest";
import { BM25 } from "../../../../src/application/search/bm25.js";

describe("BM25", () => {
  it("scores matching documents higher than non-matching", () => {
    const bm25 = new BM25();
    bm25.fit(["播放 放一首 来一首 play listen", "暂停 停一下 pause stop", "下载 download save"]);

    const results = bm25.score("播放一首歌");
    // First result should be the play document (index 0)
    expect(results[0][0]).toBe(0);
    expect(results[0][1]).toBeGreaterThan(0);
  });

  it("returns zero scores for completely unrelated queries", () => {
    const bm25 = new BM25();
    bm25.fit(["播放 放一首 play", "暂停 pause"]);

    const results = bm25.score("weather forecast");
    // All scores should be 0
    expect(results.every(([, score]) => score === 0)).toBe(true);
  });

  it("tokenizes Chinese characters and bigrams", () => {
    const bm25 = new BM25();
    const tokens = bm25.tokenize("播放周杰伦的晴天");
    // Should include single chars and bigrams
    expect(tokens).toContain("播");
    expect(tokens).toContain("放");
    expect(tokens).toContain("播放");
    expect(tokens).toContain("周杰");
  });

  it("tokenizes English words", () => {
    const bm25 = new BM25();
    const tokens = bm25.tokenize("play some music now");
    expect(tokens).toContain("play");
    expect(tokens).toContain("some");
    expect(tokens).toContain("music");
    expect(tokens).toContain("now");
  });

  it("handles mixed Chinese-English input", () => {
    const bm25 = new BM25();
    const tokens = bm25.tokenize("播放 play 周杰伦 Jay Chou");
    expect(tokens).toContain("播放");
    expect(tokens).toContain("play");
    expect(tokens).toContain("jay");
    expect(tokens).toContain("chou");
  });

  it("handles empty corpus", () => {
    const bm25 = new BM25();
    bm25.fit([]);
    const results = bm25.score("test");
    expect(results).toEqual([]);
  });

  it("ranks more relevant documents higher", () => {
    const bm25 = new BM25();
    bm25.fit([
      "收藏 喜欢 爱心 favorite like love",
      "播放 放一首 来一首 play listen start",
      "下载 保存 download save"
    ]);

    const results = bm25.score("收藏这首歌 favorite");
    expect(results[0][0]).toBe(0); // favorite doc should rank first
  });
});
