import type {
  ConversationSummary,
  Message,
} from "@/features/shared/messaging/types";
import { baseApi } from "../baseApi";
import { unwrapList } from "../pagination";

/** Cache key for a coach thread. */
export const messagesCacheKey = (tenantId: string, clientId: string) =>
  `${tenantId}:${clientId}`;

export const MESSAGES_PAGE_SIZE = 30;

const forceOlderPage = ({
  currentArg,
  previousArg,
}: {
  currentArg?: { before?: string };
  previousArg?: { before?: string };
}) => Boolean(currentArg?.before) && currentArg?.before !== previousArg?.before;

export function mergeMessages(
  existing: Message[],
  incoming: Message[]
): Message[] {
  const byId = new Map<string, Message>();
  const pending: Message[] = [];

  for (const m of existing) {
    if (m.status) {
      const echoed =
        Boolean(m.clientMsgId) &&
        incoming.some((n) => n.clientMsgId === m.clientMsgId);
      if (!echoed) pending.push(m);
      continue;
    }
    byId.set(m.id, m);
  }
  for (const m of incoming) byId.set(m.id, m);

  const merged = [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return [...merged, ...pending];
}

export const chatEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ---- Coach -----------------------------------------------------------
    getConversations: builder.query<
      ConversationSummary[],
      { tenantId: string }
    >({
      query: () => "/chat/conversations",
      // Through `unwrapList` like every other list read: the envelope key
      // varies by resource in this API (`docs`, `data`, `items`…), and a
      // hand-rolled guess at one key silently yields [] for all the others —
      // an empty inbox that looks like "no clients yet" instead of a bug.
      transformResponse: (res: unknown) => unwrapList<ConversationSummary>(res),
      providesTags: (result, error, { tenantId }) => [
        { type: "Conversations", id: `LIST-${tenantId}` },
      ],
    }),

    getMessages: builder.query<
      Message[],
      { tenantId: string; clientId: string; before?: string; limit?: number }
    >({
      query: ({ clientId, before, limit }) => ({
        url: `/chat/conversations/${clientId}/messages`,
        params: {
          ...(before ? { before } : {}),
          ...(limit ? { limit } : {}),
        },
      }),
      transformResponse: (res: unknown) => unwrapList<Message>(res),
      // One cache entry per thread: `before`/`limit` page into it rather than
      // spawning a new entry, so the socket has a single place to patch.
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}(${messagesCacheKey(queryArgs.tenantId, queryArgs.clientId)})`,
      merge: (currentCache, newItems) => mergeMessages(currentCache, newItems),
      forceRefetch: forceOlderPage,
      providesTags: (result, error, { tenantId, clientId }) => [
        { type: "Messages", id: messagesCacheKey(tenantId, clientId) },
      ],
    }),

    sendMessage: builder.mutation<
      Message,
      { tenantId: string; clientId: string; body: string; clientMsgId?: string }
    >({
      query: ({ clientId, body, clientMsgId }) => ({
        url: `/chat/conversations/${clientId}/messages`,
        method: "POST",
        body: { body, ...(clientMsgId ? { clientMsgId } : {}) },
      }),
    }),

    markRead: builder.mutation<
      { count: number },
      { tenantId: string; clientId: string }
    >({
      query: ({ clientId }) => ({
        url: `/chat/conversations/${clientId}/read`,
        method: "POST",
      }),
    }),

    // ---- Client ----------------------------------------------------------
    getMyMessages: builder.query<
      Message[],
      { tenantId: string; before?: string; limit?: number }
    >({
      query: ({ before, limit }) => ({
        url: "/client/me/chat/messages",
        params: {
          ...(before ? { before } : {}),
          ...(limit ? { limit } : {}),
        },
      }),
      transformResponse: (res: unknown) => unwrapList<Message>(res),
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}(${queryArgs.tenantId})`,
      merge: (currentCache, newItems) => mergeMessages(currentCache, newItems),
      forceRefetch: forceOlderPage,
      providesTags: (result, error, { tenantId }) => [
        { type: "Messages", id: `${tenantId}:me` },
      ],
    }),

    sendMyMessage: builder.mutation<
      Message,
      { tenantId: string; body: string; clientMsgId?: string }
    >({
      query: ({ body, clientMsgId }) => ({
        url: "/client/me/chat/messages",
        method: "POST",
        body: { body, ...(clientMsgId ? { clientMsgId } : {}) },
      }),
    }),

    markMyRead: builder.mutation<{ count: number }, { tenantId: string }>({
      query: () => ({
        url: "/client/me/chat/read",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkReadMutation,
  useGetMyMessagesQuery,
  useSendMyMessageMutation,
  useMarkMyReadMutation,
} = chatEndpoints;
