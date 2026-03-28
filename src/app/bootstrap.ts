import { createContainer } from "./container.js";

async function main() {
  const container = createContainer();
  const response = await container.musicSkillHandler.handle({
    userId: "demo-user",
    sessionId: "demo-session",
    inputType: "text",
    text: "播放周杰伦的晴天"
  });

  console.log(response);
}

void main();
