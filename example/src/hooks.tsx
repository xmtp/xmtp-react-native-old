import Xmtp, {
  Conversation,
  ConversationTopic,
  Message,
} from 'xmtp-react-native';
import { useQuery, UseQueryResult } from 'react-query';

/**
 * React hook to get the configured XMTP user's address.
 *
 * This yields a `null` address if XMTP is not configured yet.
 */
export function useXmtpAddress(): UseQueryResult<string | null> {
  return useQuery<string | null>(['xmtp', 'address'], () => Xmtp.address(), {});
}

/**
 * React hook to get the configured XMTP user's conversations.
 */
export function useXmtpConversations(): UseQueryResult<Conversation[]> {
  const { data: address } = useXmtpAddress();
  return useQuery<Conversation[]>(
    ['xmtp', 'conversations', address],
    () => Xmtp.listConversations(),
    {
      enabled: address != null,
    }
  );
}

/**
 * React hook to get the messages for the conversation {@param topic}.
 */
export function useXmtpMessages(
  topic: ConversationTopic | null
): UseQueryResult<Message[]> {
  const { data: address } = useXmtpAddress();
  return useQuery<Message[]>(
    ['xmtp', 'messages', address, topic],
    () => Xmtp.listMessages(topic!),
    {
      enabled: address != null && topic != null,
    }
  );
}
