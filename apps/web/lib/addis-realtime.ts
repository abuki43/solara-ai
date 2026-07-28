export type RealtimeState =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "speaking"
  | "error"
  | "disconnected";

export type AddisRealtimeOptions = {
  apiKey: string;
  agentId?: string;
  internalApiKey?: string;
  voiceId?: string;
  systemPrompt?: string;
  onStateChange?: (state: RealtimeState) => void;
  onError?: (error: string) => void;
  onLatency?: (ms: number) => void;
};

const INPUT_RATE = 16_000;
const OUTPUT_RATE = 24_000;

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const sample = input[i] ?? 0;
    const s = Math.max(-1, Math.min(1, sample));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    const val = int16[i] ?? 0;
    float32[i] = val / 32768.0;
  }
  return float32;
}

export class AddisRealtimeClient {
  private socket: WebSocket | null = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private muteNode: GainNode | null = null;

  private state: RealtimeState = "idle";
  private canStreamAudio = false;
  private nextStartTime = 0;
  private lastSpeakTime = 0;

  constructor(private options: AddisRealtimeOptions) {}

  public getState(): RealtimeState {
    return this.state;
  }

  private setState(newState: RealtimeState) {
    this.state = newState;
    this.options.onStateChange?.(newState);
  }

  public async start(): Promise<void> {
    if (this.state !== "idle" && this.state !== "disconnected" && this.state !== "error") {
      return;
    }

    try {
      this.setState("connecting");

      // 1. Initialize Web Audio output context
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.outputContext = new AudioCtx({ sampleRate: OUTPUT_RATE });
      await this.outputContext.resume();
      this.nextStartTime = this.outputContext.currentTime;

      // 2. Initialize Web Audio input context & microphone
      this.inputContext = new AudioCtx({ sampleRate: INPUT_RATE });
      await this.inputContext.resume();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: INPUT_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.sourceNode = this.inputContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.inputContext.createScriptProcessor(2048, 1, 1);

      this.muteNode = this.inputContext.createGain();
      this.muteNode.gain.value = 0;

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.muteNode);
      this.muteNode.connect(this.inputContext.destination);

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        // Echo Guard: Do not transmit microphone audio while AI is speaking
        if (
          !this.canStreamAudio ||
          this.state === "speaking" ||
          !this.socket ||
          this.socket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        const float32 = event.inputBuffer.getChannelData(0);
        const int16 = floatTo16BitPCM(float32);

        this.lastSpeakTime = performance.now();
        this.socket.send(
          JSON.stringify({
            data: arrayBufferToBase64(int16.buffer),
            mimeType: "audio/pcm;rate=16000",
          }),
        );
      };

      // 3. Connect to Addis AI WebSocket Endpoint
      const selectedVoice = (this.options.voiceId || "am-hamen").trim();
      const wsUrl = `wss://relay.addisassistant.com/ws?apiKey=${encodeURIComponent(
        this.options.apiKey,
      )}&voice=${encodeURIComponent(selectedVoice)}&voiceId=${encodeURIComponent(selectedVoice)}`;

      console.info("[AddisRealtime] Connecting with voice:", selectedVoice);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.info("[AddisRealtime] Connected. Sending setup payload with booking tools...");
        const setupPayload: Record<string, unknown> = {
          model: "አሌፍ-1.2-realtime-audio",
          voice: selectedVoice,
          voiceId: selectedVoice,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "checkAvailability",
                  description: "Check available appointment slots for a given service and date.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      serviceName: { type: "STRING", description: "Name of the requested service" },
                      date: { type: "STRING", description: "Target date in YYYY-MM-DD format" },
                    },
                    required: ["serviceName", "date"],
                  },
                },
                {
                  name: "bookAppointment",
                  description: "Book an appointment slot for a customer.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      serviceName: { type: "STRING", description: "Requested service name" },
                      startTime: { type: "STRING", description: "ISO datetime string of requested start time" },
                      callerName: { type: "STRING", description: "Customer full name" },
                      callerContact: { type: "STRING", description: "Customer phone number" },
                    },
                    required: ["serviceName", "startTime", "callerName", "callerContact"],
                  },
                },
              ],
            },
          ],
        };

        if (this.options.systemPrompt) {
          setupPayload.systemInstruction = {
            parts: [{ text: this.options.systemPrompt }],
          };
        }

        this.socket?.send(
          JSON.stringify({
            setup: setupPayload,
          }),
        );
      };

      this.socket.onmessage = async (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data as string) as {
            setupComplete?: boolean;
            type?: string;
            message?: string;
            error?: string;
            serverContent?: {
              modelTurn?: {
                parts?: Array<{
                  inlineData?: {
                    data?: string;
                    mimeType?: string;
                  };
                  functionCall?: {
                    id?: string;
                    name?: string;
                    args?: Record<string, unknown>;
                  };
                }>;
              };
            };
          };

          if (
            message.setupComplete ||
            (message.type === "status" && /ready/i.test(message.message || ""))
          ) {
            console.info("[AddisRealtime] Setup complete & server ready!");
            this.canStreamAudio = true;
            this.setState("ready");
            return;
          }

          if (message.error) {
            console.error("[AddisRealtime] Server error:", message.error);
            this.options.onError?.(message.error);
            return;
          }

          // Check for Tool Execution Call from AI
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.functionCall) {
                const call = part.functionCall;
                console.info("[AddisRealtime] Tool Execution requested by AI:", call.name, call.args);
                await this.handleToolCall(call.id || "call_0", call.name || "", call.args || {});
              }

              if (part.inlineData?.data) {
                if (this.lastSpeakTime > 0) {
                  const latency = Math.round(performance.now() - this.lastSpeakTime);
                  this.options.onLatency?.(latency);
                }
                this.setState("speaking");
                await this.playPcm16Base64(part.inlineData.data);
              }
            }
          }
        } catch (parseError) {
          console.warn("[AddisRealtime] Failed to parse message", parseError);
        }
      };

      this.socket.onerror = (event: Event) => {
        console.error("[AddisRealtime] WebSocket error", event);
        this.options.onError?.("WebSocket connection error");
        this.setState("error");
      };

      this.socket.onclose = (event: CloseEvent) => {
        console.info(`[AddisRealtime] WebSocket closed (code=${event.code}, reason=${event.reason || "n/a"})`);
        this.canStreamAudio = false;
        this.setState("disconnected");
      };
    } catch (error) {
      console.error("[AddisRealtime] Failed to start session", error);
      const message = error instanceof Error ? error.message : "Failed to connect";
      this.options.onError?.(message);
      this.setState("error");
      this.stop();
    }
  }

  private async handleToolCall(callId: string, toolName: string, args: Record<string, unknown>): Promise<void> {
    let resultOutput: Record<string, unknown> = {};
    const agentId = this.options.agentId;
    const internalKey = this.options.internalApiKey || "";

    try {
      if (toolName === "checkAvailability" && agentId) {
        const serviceName = String(args.serviceName || "Haircut");
        const date = String(args.date || new Date().toISOString().split("T")[0]);

        const res = await fetch(
          `http://localhost:3000/api/internal/agent/${agentId}/availability?serviceName=${encodeURIComponent(
            serviceName,
          )}&date=${encodeURIComponent(date)}`,
          {
            headers: { "X-Internal-Key": internalKey },
          },
        );

        if (res.ok) {
          const data = (await res.json()) as { slots: Array<{ localTime: string }> };
          resultOutput = {
            success: true,
            slots: data.slots,
            message: `በ${date} ክፍት ሰዓቶች ተገኝተዋል።`,
          };
        } else {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          resultOutput = { error: err.error || "ሰዓት ማግኘት አልተቻለም።" };
        }
      } else if (toolName === "bookAppointment" && agentId) {
        const serviceName = String(args.serviceName || "Haircut");
        const callerName = String(args.callerName || "Customer");
        const callerContact = String(args.callerContact || "+251911000000");
        const startTime = String(args.startTime || new Date().toISOString());

        const res = await fetch(`http://localhost:3000/api/internal/agent/${agentId}/booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Key": internalKey,
          },
          body: JSON.stringify({
            roomName: `realtime-ws-${Date.now()}`,
            serviceName,
            startTime,
            callerName,
            callerContact,
            consentGiven: true,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            confirmationCode: string;
            telegramDelivered: boolean;
            message: string;
          };
          resultOutput = {
            success: true,
            confirmationCode: data.confirmationCode,
            telegramDelivered: data.telegramDelivered,
            message: `ቀጠሮዎ በተሳካ ሁኔታ ተይዟል። የማረጋገጫ ቁጥርዎ ${data.confirmationCode} ነው።`,
          };
        } else {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          resultOutput = { error: err.error || "ቀጠሮ መያዝ አልተቻለም። እባክዎ ሌላ ሰዓት ይሞክሩ።" };
        }
      } else {
        resultOutput = { status: "ok" };
      }
    } catch (err) {
      resultOutput = { error: err instanceof Error ? err.message : "Tool error" };
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: toolName,
                      response: { output: resultOutput },
                      id: callId,
                    },
                  },
                ],
              },
            ],
          },
        }),
      );
    }
  }

  private async playPcm16Base64(base64: string): Promise<void> {
    if (!this.outputContext) return;

    try {
      const float32 = base64ToFloat32(base64);
      if (float32.length === 0) return;

      const buffer = this.outputContext.createBuffer(1, float32.length, OUTPUT_RATE);
      buffer.getChannelData(0).set(float32);

      const source = this.outputContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputContext.destination);

      const currentTime = this.outputContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;

      source.onended = () => {
        if (this.outputContext && this.outputContext.currentTime >= this.nextStartTime - 0.05) {
          if (this.state === "speaking") {
            this.setState("ready");
          }
        }
      };
    } catch (error) {
      console.warn("[AddisRealtime] Audio playback error", error);
    }
  }

  public stop(): void {
    this.canStreamAudio = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.muteNode) {
      this.muteNode.disconnect();
      this.muteNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.inputContext) {
      void this.inputContext.close();
      this.inputContext = null;
    }
    if (this.outputContext) {
      void this.outputContext.close();
      this.outputContext = null;
    }
    if (this.socket) {
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close(1000, "client-stop");
      }
      this.socket = null;
    }

    this.setState("disconnected");
  }
}
