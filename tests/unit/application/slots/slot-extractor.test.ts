import { describe, expect, it } from "vitest";
import { IntentTypes } from "../../../../src/application/intents/intent-types.js";
import { extractSlots } from "../../../../src/application/slots/slot-extractor.js";

describe("extractSlots", () => {
  it("extracts an absolute volume percent", () => {
    expect(extractSlots("音量调到 30%", IntentTypes.VolumeSet)).toMatchObject({
      volumePercent: 30
    });
  });

  it("extracts a relative decrease delta", () => {
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
    expect(extractSlots("声音别这么大", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: -10
    });
  });

  it("extracts a relative increase delta", () => {
    expect(extractSlots("音量增加15%", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: 15
    });
    expect(extractSlots("大声一点", IntentTypes.VolumeSet)).toMatchObject({
      volumeDelta: 10
    });
  });
});
