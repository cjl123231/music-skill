import { describe, expect, it } from "vitest";
import { IntentTypes } from "../../../../src/application/intents/intent-types.js";
import { extractSlots } from "../../../../src/application/slots/slot-extractor.js";

describe("extractSlots", () => {
  it("extracts absolute volume percent", () => {
    expect(extractSlots("音量调到 30%", IntentTypes.VolumeSet)).toMatchObject({
      volumePercent: 30
    });
    expect(extractSlots("音量调到10%", IntentTypes.VolumeSet)).toMatchObject({
      volumePercent: 10
    });
  });

  it("extracts relative decrease delta", () => {
    expect(extractSlots("音量减少10%", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: -10
    });
    expect(extractSlots("减少一点", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: -10
    });
    expect(extractSlots("小一点", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: -10
    });
    expect(extractSlots("再小一点", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: -10
    });
    expect(extractSlots("太大声了", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: -10
    });
  });

  it("extracts relative increase delta", () => {
    expect(extractSlots("音量增加15%", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: 15
    });
    expect(extractSlots("大声一点", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: 10
    });
    expect(extractSlots("加一点音量", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: 10
    });
  });

  it("extracts mute and unmute intents", () => {
    expect(extractSlots("静音", IntentTypes.VolumeSet)).toMatchObject({
      volumePercent: 0
    });
    expect(extractSlots("取消静音", IntentTypes.VolumeSet)).toMatchObject({
      volumePercent: 50
    });
  });
});
