import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";

class FakeReadable extends EventEmitter {
  setEncoding(): void {
    // no-op
  }
}

class FakeWritable {
  writes: string[] = [];

  write(chunk: string): void {
    this.writes.push(chunk);
  }
}

class FakeChildProcess extends EventEmitter {
  stdout = new FakeReadable();
  stderr = new FakeReadable();
  stdin = new FakeWritable();
  killed = false;

  unref(): void {
    // no-op
  }
}

describe("WindowsPlaybackController", () => {
  it("parses a reply that arrives in multiple stdout chunks", async () => {
    const fakeHost = new FakeChildProcess();
    const playbackModule = await import("../../../../src/infrastructure/playback/windows-playback.controller.js");
    const controller = new playbackModule.WindowsPlaybackController(() => fakeHost as never);

    const result = controller.pause();
    await Promise.resolve();
    fakeHost.stdout.emit("data", Buffer.from('{"ok":'));
    fakeHost.stdout.emit("data", Buffer.from("true}\n"));

    await expect(result).resolves.toBeUndefined();
  });

  it("serializes commands so the second write waits for the first reply", async () => {
    const fakeHost = new FakeChildProcess();
    const playbackModule = await import("../../../../src/infrastructure/playback/windows-playback.controller.js");
    const controller = new playbackModule.WindowsPlaybackController(() => fakeHost as never);

    const first = controller.pause();
    const second = controller.resume();
    await Promise.resolve();

    expect(fakeHost.stdin.writes).toHaveLength(1);

    fakeHost.stdout.emit("data", Buffer.from('{"ok":true}\n'));
    await expect(first).resolves.toBeUndefined();

    expect(fakeHost.stdin.writes).toHaveLength(2);

    fakeHost.stdout.emit("data", Buffer.from('{"ok":true}\n'));
    await expect(second).resolves.toBeUndefined();
  });
});
