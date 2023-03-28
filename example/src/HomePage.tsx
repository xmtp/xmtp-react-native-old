import { useXmtpAddress, useXmtpConversations, useXmtpMessages } from './hooks';
import { useState } from 'react';
import Xmtp, { ConversationTopic } from 'xmtp-react-native';
import {
  Button,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as React from 'react';

/**
 * Simple page to demonstrate the XMTP react native library.
 *
 * It does the basics of reading messages:
 *  - presents a "Connect" button to configure the XMTP user.
 *  - lists the conversations for that user.
 *  - shows a modal overlay for messages in a particular conversation.
 */
export default function HomePage() {
  const { data: address } = useXmtpAddress();
  const [topic, setTopic] = useState<ConversationTopic | null>(null);
  const isConnected = address != null;
  return (
    <SafeAreaView style={{ backgroundColor: Colors.darker }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darker} />
      {isConnected ? (
        <ConversationList onPressTopic={setTopic} />
      ) : (
        <ConnectButton />
      )}
      <ConversationModal topic={topic} onClose={() => setTopic(null)} />
    </SafeAreaView>
  );
}

/**
 * Show a {@link Button} to configure the current XMTP user.
 */
function ConnectButton() {
  const { data: address, refetch: checkConnected } = useXmtpAddress();

  // This private key is the connected user. Don't do this in a real app.
  // TODO: support deferred signing callbacks instead of raw keys
  const EXAMPLE_PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  // Address = 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 to message it.
  // Incidentally, this key is the ephemeral hardhat account #0
  // https://hardhat.org/hardhat-network/docs/overview#running-stand-alone-in-order-to-support-wallets-and-other-software
  return (
    <Button
      color={Colors.primary}
      // Disable the button if we're already connected.
      disabled={!!address}
      title="Connect"
      onPress={() =>
        Xmtp.configure('dev', EXAMPLE_PRIVATE_KEY)
          .then(() => checkConnected())
          .catch((err) => console.error(err.stack))
      }
    />
  );
}

/**
 * Show a `FlatList` of conversations for the current XMTP user.
 *
 * This triggers {@param onPressTopic} when the user selects a conversation.
 */
function ConversationList({
  onPressTopic,
}: {
  onPressTopic: (topic: ConversationTopic) => void;
}) {
  const { data: conversations } = useXmtpConversations();
  if (!conversations) {
    return null;
  }
  return (
    <FlatList
      data={conversations}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onPressTopic(item.topic)}
          style={styles.conversationItemContainer}
        >
          <Text style={styles.conversationItemPeer}>
            {abbreviateAddress(item.peerAddress)}
          </Text>
          <Text style={styles.conversationItemTopic}>{item.topic}</Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.topic}
    />
  );
}

/**
 * Show a {@link Modal} listing messages for the conversation {@param topic}.
 *
 * The {@link Modal} is not visible when {@param topic} is absent.
 * This triggers {@param onClose} when the user dismisses the modal.
 */
function ConversationModal({
  topic,
  onClose,
}: {
  topic: ConversationTopic | null;
  onClose: () => void;
}) {
  const { data: messages } = useXmtpMessages(topic);
  return (
    <Modal
      visible={!!topic}
      animationType={'slide'}
      statusBarTranslucent
      onDismiss={onClose}
      onRequestClose={onClose}
    >
      <View style={styles.messagesContainer}>
        <FlatList
          data={messages}
          ListHeaderComponent={
            <View style={styles.closeButton}>
              <Button onPress={onClose} title="Close" color={Colors.primary} />
            </View>
          }
          renderItem={({ item }) => (
            <Text style={styles.messageText}>
              {abbreviateAddress(item.senderAddress)}&gt; {item.text}
            </Text>
          )}
          keyExtractor={({ id }) => id}
        />
      </View>
    </Modal>
  );
}

/// Helpers

const Colors = {
  primary: '#fc4f37',
  white: '#FFF',
  lighter: '#F3F3F3',
  light: '#DAE1E7',
  dark: '#444',
  darker: '#222',
  black: '#000',
};

const styles = StyleSheet.create({
  conversationItemContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  conversationItemPeer: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '600',
  },
  conversationItemTopic: {
    color: Colors.light,
    marginTop: 8,
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '400',
  },
  messagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
  },
  messageText: {
    textAlign: 'left',
    fontSize: 20,
    fontWeight: '400',
  },
  closeButton: { margin: 20 },
});

/**
 * Abbreviate an {@param address} to the first 6 and last 4 characters.
 */
function abbreviateAddress(address: string) {
  if ((address ?? '').length < 6) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
