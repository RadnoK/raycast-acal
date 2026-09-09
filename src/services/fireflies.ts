import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FIREFLIES_MCP, firefliesToken } from "./fireflies-auth";
import {
  parseConversations,
  parseTranscript,
  toolData,
} from "../lib/fireflies-data";
import type { Conversation } from "../lib/types";

type ReadTool =
  | "fireflies_get_transcripts"
  | "fireflies_get_transcript"
  | "fireflies_get_summary";
async function readTool(
  name: ReadTool,
  args: Record<string, unknown>,
  signal?: AbortSignal,
  retry = false,
): Promise<unknown> {
  const token = await firefliesToken(retry);
  const client = new Client({ name: "acal-raycast", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(FIREFLIES_MCP), {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal,
    },
  });
  try {
    signal?.throwIfAborted();
    await client.connect(transport, { timeout: 30_000, signal });
    return toolData(
      await client.callTool({ name, arguments: args }, undefined, {
        timeout: 60_000,
        signal,
      }),
    );
  } catch (error) {
    if (!retry && error instanceof StreamableHTTPError && error.code === 401)
      return readTool(name, args, signal, true);
    if (error instanceof StreamableHTTPError)
      throw new Error(
        `Fireflies connection error (${error.code}). Check your account in Acal Connections.`,
      );
    throw error;
  } finally {
    await client.close().catch(() => undefined);
  }
}
export async function listConversations(
  keyword: string,
  skip: number,
  signal?: AbortSignal,
) {
  return parseConversations(
    await readTool(
      "fireflies_get_transcripts",
      {
        ...(keyword.trim()
          ? { keyword: keyword.trim().slice(0, 255), scope: "title" }
          : {}),
        limit: 25,
        skip,
        mine: true,
        format: "json",
      },
      signal,
    ),
  );
}
export async function loadTranscript(
  conversation: Conversation,
  signal?: AbortSignal,
) {
  const [transcript, summary] = await Promise.all([
    readTool(
      "fireflies_get_transcript",
      { transcriptId: conversation.id },
      signal,
    ),
    readTool(
      "fireflies_get_summary",
      { transcriptId: conversation.id },
      signal,
    ),
  ]);
  return parseTranscript(transcript, summary, conversation);
}
