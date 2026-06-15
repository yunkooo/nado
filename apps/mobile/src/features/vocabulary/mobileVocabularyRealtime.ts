import { createVocabularyRealtimeTopic } from "@nado/shared";

const vocabularyRealtimeEvents = ["INSERT", "UPDATE", "DELETE"] as const;

type VocabularyRealtimeChannel = {
  on(
    eventType: "broadcast",
    filter: { event: (typeof vocabularyRealtimeEvents)[number] },
    callback: () => void,
  ): VocabularyRealtimeChannel;
  subscribe(): VocabularyRealtimeChannel;
};

type VocabularyRealtimeClient = {
  channel(
    topic: string,
    options: { config: { private: true } },
  ): VocabularyRealtimeChannel;
  realtime: {
    setAuth(accessToken: string): void;
  };
  removeChannel(channel: VocabularyRealtimeChannel): unknown;
};

export function subscribeMobileVocabularyRealtime({
  accessToken,
  client,
  onChange,
  userId,
}: {
  accessToken: string | null | undefined;
  client: VocabularyRealtimeClient;
  onChange: () => void;
  userId: string | null | undefined;
}) {
  const topic = createVocabularyRealtimeTopic(userId);

  if (!accessToken || !topic) {
    return () => undefined;
  }

  client.realtime.setAuth(accessToken);

  const channel = client.channel(topic, {
    config: { private: true },
  });

  for (const event of vocabularyRealtimeEvents) {
    channel.on("broadcast", { event }, onChange);
  }

  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
