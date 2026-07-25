import {
  DEFAULT_API_CONNECT_OPTIONS,
  type APIConnectOptions,
  llm,
  shortuuid,
} from "@livekit/agents";
import { getAddisClient } from "./client.ts";

type AddisMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

function toolParametersToJsonSchema(parameters: unknown): Record<string, unknown> {
  if (
    parameters &&
    typeof parameters === "object" &&
    "toJSONSchema" in parameters &&
    typeof (parameters as { toJSONSchema: () => unknown }).toJSONSchema === "function"
  ) {
    return (parameters as { toJSONSchema: () => Record<string, unknown> }).toJSONSchema();
  }
  if (parameters && typeof parameters === "object") {
    return parameters as Record<string, unknown>;
  }
  return { type: "object", properties: {} };
}

function chatItemsToAddisMessages(chatCtx: llm.ChatContext): {
  system?: string;
  messages: AddisMessage[];
} {
  let system: string | undefined;
  const messages: AddisMessage[] = [];

  for (const item of chatCtx.items) {
    if (item.type === "message") {
      const text = item.textContent?.trim() ?? "";
      if (!text) continue;
      if (item.role === "system" || item.role === "developer") {
        system = system ? `${system}\n${text}` : text;
        continue;
      }
      messages.push({
        role: item.role === "assistant" ? "assistant" : "user",
        content: text,
      });
      continue;
    }

    if (item.type === "function_call") {
      const last = messages[messages.length - 1];
      const toolCall = {
        id: item.callId,
        type: "function" as const,
        function: { name: item.name, arguments: item.args },
      };
      if (last?.role === "assistant") {
        last.tool_calls = [...(last.tool_calls ?? []), toolCall];
      } else {
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        });
      }
      continue;
    }

    if (item.type === "function_call_output") {
      messages.push({
        role: "tool",
        tool_call_id: item.callId,
        name: item.name,
        content: item.output,
      });
    }
  }

  return { system, messages };
}

export class AddisLLM extends llm.LLM {
  label(): string {
    return "addis.LLM";
  }

  get model(): string {
    return "addis-1-alef";
  }

  get provider(): string {
    return "addisassistant.com";
  }

  chat({
    chatCtx,
    toolCtx: toolCtxInput,
    connOptions = DEFAULT_API_CONNECT_OPTIONS,
  }: {
    chatCtx: llm.ChatContext;
    toolCtx?: llm.ToolContextLike;
    connOptions?: APIConnectOptions;
    parallelToolCalls?: boolean;
    toolChoice?: llm.ToolChoice;
    extraKwargs?: Record<string, unknown>;
  }): llm.LLMStream {
    const toolCtx = llm.toToolContext(toolCtxInput);
    return new AddisLLMStream(this, { chatCtx, toolCtx, connOptions });
  }
}

class AddisLLMStream extends llm.LLMStream {
  protected async run(): Promise<void> {
    const { system, messages } = chatItemsToAddisMessages(this.chatCtx);
    if (!messages.length) {
      this.queue.put({ id: shortuuid(), delta: { role: "assistant", content: "" } });
      this.queue.close();
      return;
    }

    const tools =
      this.toolCtx && Object.keys(this.toolCtx.functionTools).length
        ? llm.sortedToolEntries(this.toolCtx).map(([name, tool]) => ({
            type: "function" as const,
            function: {
              name,
              description: tool.description,
              parameters: toolParametersToJsonSchema(tool.parameters),
            },
          }))
        : undefined;

    const completion = await getAddisClient().chat.completions.create({
      language: "am",
      system,
      messages,
      tools,
      tool_choice: tools?.length ? "auto" : undefined,
      temperature: 0.4,
      max_tokens: 400,
    });

    const message = completion.choices[0]?.message;
    const id = completion.id || shortuuid();

    if (message?.tool_calls?.length) {
      this.queue.put({
        id,
        delta: {
          role: "assistant",
          toolCalls: message.tool_calls.map((call) =>
            llm.FunctionCall.create({
              callId: call.id,
              name: call.function.name,
              args: call.function.arguments,
            }),
          ),
        },
      });
    } else {
      this.queue.put({
        id,
        delta: {
          role: "assistant",
          content: message?.content ?? "",
        },
      });
    }

    this.queue.close();
  }
}
