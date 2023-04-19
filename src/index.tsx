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

type KeyBundle = string;
type CreateAccountPrompt = string; // "XMTP : Create ..."
type CreateAccountContext = string; // the identity key being created
type EnableAccountPrompt = string; // "XMTP : Enable ..."
type EnableAccountContext = string; // the encrypted key bundle to decrypt

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SignedPrompt<Prompt = string> = string;

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
 * Auth
 * ----
 * There are three auth scenarios we need to support:
 *
 *  1. Already Logged-in - the app has saved credentials for the user
 *     - The app just calls {@link init} with the saved {@link KeyBundle}
 *
 *  2. Existing Account - the address has an XMTP account (but hasn't logged in)
 *     - The app calls {@link authCheck} and learns that they {@link hasSavedAuth}
 *     - The app prompts the user to sign the {@link loadPrompt}
 *     - The app calls {@link authLoad} to get the {@link KeyBundle}
 *     - The app calls {@link init} with the {@link KeyBundle}
 *     - The app saves the {@link KeyBundle} for next session.
 *
 *  3. New Account - the address is new to XMTP
 *     - The app calls {@link authCheck} and learns there is no saved auth
 *     - The app prompts the user to sign the {@link createPrompt}
 *     - The app calls {@link authCreate} to get the {@link KeyBundle}
 *     - The app calls {@link init} with the {@link KeyBundle}
 *     - The app prompts the user to sign the {@link savePrompt} to save it
 *     - The app calls {@link authSave} with the {@link KeyBundle}
 *     - The app saves the {@link KeyBundle} for next session.
 *
 * TODO: consider handling saved credentials in native code (to reduce back/forth)
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
   * Configure XMTP to use the specified {@param env}.
   */
  configure(env: 'local' | 'dev' | 'production'): Promise<boolean>;

  /**
   * Check if {@param address} has a saved account on XMTP.
   *
   * Based on whether the user {@param hasSavedAuth} the
   * app should prompt the user's wallet to sign one of two prompts:
   *  {@link createPrompt} to create a new account via {@link authCreate}.
   *  {@link loadPrompt} to load an existing account via {@link authLoad}.
   */
  authCheck(address: string): Promise<{
    hasSavedAuth: boolean;

    // These are present when {@link hasSavedAuth} is false
    // The prompt should be presented to the user to sign.
    // And then the context should be included during {@link authCreate}
    createPrompt?: CreateAccountPrompt;
    createContext?: CreateAccountContext;

    // These are present when {@link hasSavedAuth} is true
    // The prompt should be presented to the user to sign.
    // And then the context should be included during {@link authLoad}
    loadPrompt?: EnableAccountPrompt;
    loadContext?: EnableAccountContext;
  }>;

  /**
   * Create a new XMTP account for {@param address}.
   *
   * Given a {@param createPromptSigned} and {@param createContext}, this
   * generates the {@link KeyBundle}.
   *
   * It also returns the {@link savePrompt} which the app should prompt the
   * user to sign. This signature lets us encrypt and save their credentials
   * to the network via {@link authSave}.
   */
  authCreate(
    address: string,
    createPromptSigned: SignedPrompt<CreateAccountPrompt>,
    createContext: CreateAccountContext
  ): Promise<{
    keyBundle: KeyBundle;

    // The prompt should be presented to the user to sign for {@link authSave}
    // This encrypts and stores the keys to network for use elsewhere later.
    savePrompt: EnableAccountPrompt;
    saveContext: EnableAccountContext;
  }>;

  /**
   * Load an elsewhere saved {@link KeyBundle} from the network.
   *
   * This uses the {@param loadPromptSigned} along with the {@param loadContext}
   * received from {@link authCheck} to decrypt the bundle.
   */
  authLoad(
    loadPromptSigned: SignedPrompt<EnableAccountPrompt>,
    loadContext: EnableAccountContext
  ): Promise<KeyBundle>;

  /**
   * Save the {@param keyBundle} to the network for use elsewhere later.
   *
   * This uses the {@param savePromptSigned} along with the {@param saveContext}
   * received from {@link authCreate} to encrypt the bundle.
   */
  authSave(
    keyBundle: KeyBundle,
    savePromptSigned: SignedPrompt<EnableAccountPrompt>,
    saveContext: EnableAccountContext
  ): Promise<boolean>;

  /**
   * Initialize XMTP using the {@param keyBundle}.
   */
  init(keyBundle: KeyBundle): Promise<boolean>;

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
  sendMessage(topic: ConversationTopic, text: string): Promise<boolean>;
}

export interface XmtpSigner {
  getAddress(): Promise<string>;
  signMessage<Prompt = CreateAccountPrompt | EnableAccountPrompt>(
    message: Prompt
  ): Promise<SignedPrompt<Prompt>>;
}

/**
 * Create or load an XMTP account from the network for {@param wallet}.
 *
 * This will first check the network to see if the user has a saved account.
 * If not, it will prompt them to "create" it.
 *
 * It will prompt to "enable" the account to save it (if it was just created) or
 * to load it (if it's a pre-existing account).
 *
 * It {@returns keyBundle} which can be stored securely locally for quick
 * initialization next session.
 */
export async function authWallet(wallet: XmtpSigner): Promise<KeyBundle> {
  let address = await wallet.getAddress();
  let { hasSavedAuth, loadPrompt, loadContext, createPrompt, createContext } =
    await XmtpReactNative.authCheck(address);
  if (hasSavedAuth) {
    let loadPromptSigned = await wallet.signMessage(loadPrompt!);
    let keyBundle = await XmtpReactNative.authLoad(
      loadPromptSigned,
      loadContext!
    );
    await XmtpReactNative.init(keyBundle);
    return keyBundle;
  }
  let createPromptSigned = await wallet.signMessage(createPrompt!);
  let { keyBundle, savePrompt, saveContext } = await XmtpReactNative.authCreate(
    address,
    createPromptSigned,
    createContext!
  );
  await XmtpReactNative.init(keyBundle);
  let savePromptSigned = await wallet.signMessage(savePrompt!);
  await XmtpReactNative.authSave(keyBundle, savePromptSigned, saveContext!);
  return keyBundle;
}

export default XmtpReactNative as Xmtp;
