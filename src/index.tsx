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

export interface Conversation {
  readonly topic: string;
  readonly peerAddress: string;
  readonly conversationId: string;
}

export interface Message {
  readonly id: string;
  readonly senderAddress: string;
  readonly text: string;
}

export interface Xmtp {
  configure(
    env: string, // 'local' | 'dev' | 'production',
    privateKey: string
  ): Promise<boolean>;

  newConversation(peerAddress: string): Promise<Conversation>;

  listConversations(): Promise<Conversation[]>;

  listMessages(topic: string): Promise<Message[]>;

  sendMessage(topic: string, text: string): Promise<Message[]>;
}

export default XmtpReactNative as Xmtp;
