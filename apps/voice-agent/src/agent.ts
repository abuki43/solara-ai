import { Agent, inference } from "@livekit/agents";

export function createAgent(instructions: string) {
  return Agent.create({
    instructions,
    llm: new inference.LLM({ model: "google/gemma-4-31b-it" }),
  });
}
