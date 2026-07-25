import { env } from "@solar-ai/env/server";
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
} from "livekit-server-sdk";
import { Router } from "express";
import { randomUUID } from "node:crypto";

export const AGENT_NAME = "solar-receptionist";

export const livekitRouter: Router = Router();

livekitRouter.post("/token", async (req, res) => {
  try {
    const roomName = (req.body?.roomName as string | undefined) ?? `call-${randomUUID()}`;
    const participantName =
      (req.body?.participantName as string | undefined) ?? `caller-${randomUUID().slice(0, 8)}`;

    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: participantName,
      name: participantName,
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    token.roomConfig = new RoomConfiguration({
      agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
    });

    const jwt = await token.toJwt();

    res.json({
      token: jwt,
      roomName,
      participantName,
      url: env.LIVEKIT_URL,
    });
  } catch (error) {
    console.error("Failed to create LiveKit token:", error);
    res.status(500).json({ error: "Failed to create LiveKit token" });
  }
});
