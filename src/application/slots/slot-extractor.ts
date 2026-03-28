import type { IntentType } from "../intents/intent-types.js";
import { IntentTypes } from "../intents/intent-types.js";
import type { SlotMap } from "./slot-types.js";

function extractPlaySlots(text: string): SlotMap {
  const playPrefix = /^(播放|放一首|来一首|给我播放一个|放个|给我放|听一首|我想听|点首|来首|听听|play\b)\s*/i;
  const rawKeyword = text.replace(playPrefix, "").trim();

  if (!rawKeyword) {
    return {};
  }

  const favoriteOnly =
    /^我的收藏$/.test(rawKeyword) ||
    /^收藏$/.test(rawKeyword) ||
    /^我收藏的.+/.test(rawKeyword) ||
    /^收藏的.+/.test(rawKeyword);

  let keyword = rawKeyword;
  if (/^我的收藏$/.test(rawKeyword) || /^收藏$/.test(rawKeyword)) {
    keyword = "";
  } else if (/^我收藏的/.test(rawKeyword)) {
    keyword = rawKeyword.replace(/^我收藏的/, "").trim();
  } else if (/^收藏的/.test(rawKeyword)) {
    keyword = rawKeyword.replace(/^收藏的/, "").trim();
  }

  const cnMatch = keyword.match(/^(.+?)的(.+)$/);
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
    const match = text.match(/(\d+)\s*%?/);
    if (match) {
      return { volumePercent: Number(match[1]) };
    }
  }

  if (intent === IntentTypes.PlaylistAddTrack) {
    const cnMatch = text.match(/加入(.+?)歌单/);
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
