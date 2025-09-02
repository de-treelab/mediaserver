import { createContext, useContext } from "react";
import z from "zod";

export const webSocketIncomingMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connected"),
    id: z.string(),
  }),
  z.object({
    type: z.literal("upload-failed"),
    reason: z.string(),
    file: z.string(),
  }),
  z.object({
    type: z.literal("upload-finished"),
    file: z.string(),
  }),
]);

export type WebSocketIncomingMessageSchema = z.infer<
  typeof webSocketIncomingMessageSchema
>;

type WebSocketContextType = {
  sendMessage: (message: string) => void;
  webSocketClientId: string | undefined;
  registerMessageHandler: (
    handler: (message: WebSocketIncomingMessageSchema) => void,
  ) => void;
  unregisterMessageHandler: (
    handler: (message: WebSocketIncomingMessageSchema) => void,
  ) => void;
};

export const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
};
