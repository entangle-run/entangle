import { createStubAgentEngine } from "@entangle/agent-engine";
import { agentEngineTurnRequestSchema } from "@entangle/types";
import { generateSecretKey, getPublicKey } from "nostr-tools";

async function main(): Promise<void> {
  const engine = createStubAgentEngine();
  const publicKey = getPublicKey(generateSecretKey());

  const request = agentEngineTurnRequestSchema.parse({
    sessionId: "bootstrap-session",
    nodeId: "bootstrap-runner",
    systemPromptParts: ["You are an Entangle node runtime scaffold."],
    interactionPromptParts: [
      "Confirm that the runner, engine boundary, and Nostr identity surface are wired."
    ],
    toolDefinitions: [],
    artifactRefs: [],
    memoryRefs: [],
    executionLimits: {
      maxToolTurns: 4,
      maxOutputTokens: 2048
    }
  });

  const result = await engine.executeTurn(request);

  console.log(
    JSON.stringify(
      {
        publicKey,
        result
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
