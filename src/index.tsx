import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'xmtp-react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const XmtpReactNative = NativeModules.XmtpReactNative
  ? NativeModules.XmtpReactNative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/** This is an opaque unique identifier for a message. */
export type MessageId = string;
/** This is an opaque unique identifier for a conversation. */
export type ConversationTopic = string;
/** This is additional context for a conversation. */
export type ConversationMetadata = { [type: string]: string };

/**
 * This represents an ongoing conversation with {@link #peerAddress}.
 *
 * TODO: support metadata
 */
export interface Conversation {
  /**
   * This an opaque unique identifier for this conversation.
   * It is used to {@link Xmtp.listMessages} and {@link Xmtp.sendMessage}.
   */
  readonly topic: ConversationTopic;
  /**
   * This is the address of the other person in the conversation.
   */
  readonly peerAddress: string;
  /**
   * See {@link Xmtp.newConversation} for more details.
   */
  readonly conversationId: string;
}

/**
 * This represents a single message in a conversation.
 * It is returned by {@link Xmtp.listMessages}.
 * And it only supports text content type, for now.
 *
 * TODO: support content types beyond text
 */
export interface Message {
  /**
   * This is an opaque unique identifier for this message.
   */
  readonly id: MessageId;
  /**
   * This is the address of the other person in the conversation.
   */
  readonly senderAddress: string;
  /**
   * This is the content of the text message.
   */
  readonly text: string;
}

/**
 * This is a simplified interface to the XMTP SDKs via react native bridge.
 *
 * It represents a very focused subset of the broader XMTP SDKs.
 *
 * It operates as a single {@link Xmtp.configure}d user.
 * It can {@link #listConversations} and create a {@link #newConversation}.
 * It can {@link #listMessages} in a conversation and it can {@link #sendMessage}.
 * It only supports text messages, for now.
 *
 * TODO: support wallet configuration flows
 * TODO: support content types beyond text
 * TODO: support streaming updates from conversations/messages.
 */
export interface Xmtp {
  /**
   * Get the ethereum address of the configured user.
   *
   * Returns `null` when the user is not configured yet.
   */
  address(): Promise<string | null>;

  /**
   * Connect to {@param env} as the user having {@param privateKey}.
   *
   * NOTE: this is a placeholder until we implement a proper flow.
   * Instead of passing private keys, the user should be prompted to sign
   * messages to enable XMTP. To support this we will add more methods:
   *   TODO: configureWithWallet(...) (new user)
   *   TODO: configureWithKeys(...) (saved user)
   */
  configure(
    env: 'local' | 'dev' | 'production',
    privateKey: string
  ): Promise<boolean>;

  /**
   * Create or resume a {@link Conversation} with {@param peerAddress}.
   *
   * If a {@param conversationId} is specified then that will
   * distinguish multiple conversations with the same user.
   * A new {@param conversationId} always creates a new conversation.
   * The {@param metadata} includes any additional context for the conversation.
   **/
  newConversation(
    peerAddress: string,
    conversationId: string,
    metadata: ConversationMetadata
  ): Promise<Conversation>;

  /**
   * List all conversations for the current user.
   *
   * TODO: support `start`, `end`, `limit`, and `sort` options
   */
  listConversations(): Promise<Conversation[]>;

  /**
   * List all messages for the identified conversation {@param topic}.
   *
   * TODO: support `start`, `end`, `limit`, and `sort` options
   * TODO: support listBatchMessages for multiple conversations
   */
  listMessages(topic: ConversationTopic): Promise<Message[]>;

  /**
   * Send a {@param text} message to the identified conversation {@param topic}.
   *
   * TODO: support content types beyond text
   */
  sendMessage(topic: ConversationTopic, text: string): Promise<Message[]>;
}

export default XmtpReactNative as Xmtp;
