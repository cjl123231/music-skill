import type { IntentType } from "../intents/intent-types.js";
import { IntentTypes } from "../intents/intent-types.js";
import type { SlotMap } from "./slot-types.js";

const playPrefix =
  /^(?:\u64ad\u653e|\u653e\u4e00\u9996|\u6765\u4e00\u9996|\u7ed9\u6211\u64ad\u653e\u4e00\u4e2a|\u653e\u4e2a|\u6765\u70b9\u97f3\u4e50|\u7ed9\u6211\u653e|\u542c\u4e00\u9996|\u6211\u60f3\u542c|\u6211\u60f3\u542c\u6b4c|\u7ed9\u6211\u6765\u4e00\u9996|\u70b9\u9996|\u6765\u9996|\u542c\u542c|play\b|listen to\b|start playing\b|put on\b|queue\b|play me\b|i want to hear\b|let me hear\b|start\b)\s*/i;

function extractPlaySlots(text: string): SlotMap {
  const rawKeyword = text.replace(playPrefix, "").trim();

  if (!rawKeyword) {
    return {};
  }

  const favoriteOnly =
    /^\u6211\u7684\u6536\u85cf$/.test(rawKeyword) ||
    /^\u6536\u85cf$/.test(rawKeyword) ||
    /^\u6211\u6536\u85cf\u7684.+/.test(rawKeyword) ||
    /^\u6536\u85cf\u7684.+/.test(rawKeyword);

  let keyword = rawKeyword;
  if (/^\u6211\u7684\u6536\u85cf$/.test(rawKeyword) || /^\u6536\u85cf$/.test(rawKeyword)) {
    keyword = "";
  } else if (/^\u6211\u6536\u85cf\u7684/.test(rawKeyword)) {
    keyword = rawKeyword.replace(/^\u6211\u6536\u85cf\u7684/, "").trim();
  } else if (/^\u6536\u85cf\u7684/.test(rawKeyword)) {
    keyword = rawKeyword.replace(/^\u6536\u85cf\u7684/, "").trim();
  }

  const cnMatch = keyword.match(/^(.+?)\u7684(.+)$/);
  const enMatch = keyword.match(/^(.+?)\s+-\s+(.+)$/);

  if (cnMatch) {
    return {
      artistName: cnMatch[1].trim(),
      keyword: cnMatch[2].trim(),
      favoriteOnly
    };
  }

  if (enMatch) {
    return {
      artistName: enMatch[1].trim(),
      keyword: enMatch[2].trim(),
      favoriteOnly
    };
  }

  return { keyword, favoriteOnly };
}

export function extractSlots(input: string, intent: IntentType): SlotMap {
  const text = input.trim();

  if (intent === IntentTypes.Play) {
    return extractPlaySlots(text);
  }

  if (intent === IntentTypes.VolumeSet) {
    const compact = text.replace(/\s+/g, "");
    const numericMatch = text.match(/(\d+)\s*%?/);
    const numericValue = numericMatch ? Number(numericMatch[1]) : undefined;
    const muteIntent = /^(?:\u9759\u97f3|mute)$/i.test(text);
    const unmuteIntent = /^(?:\u53d6\u6d88\u9759\u97f3|\u6062\u590d\u58f0\u97f3|unmute)$/i.test(text);
    const relativeDecrease =
      /(?:\u51cf|\u51cf\u5c11|\u8c03\u4f4e|\u4f4e\u4e00\u70b9|\u5c0f\u4e00\u70b9|\u5c0f\u58f0\u4e00\u70b9|\u8f7b\u4e00\u70b9|\u592a\u5927\u58f0\u4e86|\u592a\u5413\u4eba|\u58f0\u97f3\u592a\u5927\u4e86|\u58f0\u97f3\u522b\u8fd9\u4e48\u5927|\u522b\u8fd9\u4e48\u5927\u58f0|turn down|volume down|lower|quieter)/i.test(
        text
      );
    const relativeIncrease =
      /(?:\u52a0|\u589e\u52a0|\u8c03\u9ad8|\u9ad8\u4e00\u70b9|\u5927\u4e00\u70b9|\u5927\u58f0\u4e00\u70b9|\u54cd\u4e00\u70b9|turn up|volume up|raise|louder)/i.test(
        text
      );
    const absoluteIntent =
      /(?:\u8c03\u5230|\u8bbe\u4e3a|\u8bbe\u7f6e\u4e3a|\u8c03\u6210|set volume to)/i.test(text) ||
      /^\u97f3\u91cf\s*\d+\s*%?$/i.test(compact) ||
      /^volume\s*\d+\s*%?$/i.test(compact);

    if (muteIntent) {
      return { volumePercent: 0 };
    }

    if (unmuteIntent) {
      return { volumePercent: 50 };
    }

    if ((relativeDecrease || relativeIncrease) && !absoluteIntent) {
      const step = numericValue ?? 10;
      return { volumeDelta: relativeDecrease ? -step : step };
    }

    if (numericValue != null) {
      return { volumePercent: numericValue };
    }
  }

  if (intent === IntentTypes.PlaylistAddTrack) {
    const cnMatch = text.match(/\u52a0\u5165(.+?)\u6b4c\u5355/);
    const enMatch = text.match(/add this song to (.+?) playlist/i);

    if (cnMatch) {
      return { playlistName: cnMatch[1].trim() };
    }

    if (enMatch) {
      return { playlistName: enMatch[1].trim() };
    }
  }

  return {};
}
