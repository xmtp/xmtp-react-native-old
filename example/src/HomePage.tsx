import { useXmtpAddress, useXmtpConversations, useXmtpMessages } from './hooks';
import { useState } from 'react';
import Xmtp, {
  authWallet,
  type ConversationTopic,
  type XmtpSigner,
} from 'xmtp-react-native';
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
import '@ethersproject/shims';
import { ethers } from 'ethers';
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
  const { data: address, refetch } = useXmtpAddress();
  const [topic, setTopic] = useState<ConversationTopic | null>(null);
  const isConnected = address != null;
  return (
    <SafeAreaView style={{ backgroundColor: Colors.darker }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darker} />
      {isConnected ? (
        <>
          <SendMessageButton />
          <ConversationList onPressTopic={setTopic} />
        </>
      ) : (
        <ConnectButton onConnected={refetch} />
      )}
      <ConversationModal topic={topic} onClose={() => setTopic(null)} />
    </SafeAreaView>
  );
}

// Randomly generated example private key.
// address = 0x9385da9C104e9ABB7aA6822Eb380C8C3C7D00AFB
const EXAMPLE_PRIVATE_KEY =
  '0xeec5aaff7bcdcabba39c4808d05c562bb5aa77fb12a06c678d8dbad7917593fe';
const signer = new ethers.Wallet(EXAMPLE_PRIVATE_KEY);

// recipient pk = "0xa52e4027e610c519885c7ef1f7ab69d0956981dd0f90053581e59996c8482341"
const recipient = '0x9eA724075bc85d8bD767E84Be74C15F1DD96a1fb';

function SendMessageButton() {
  return (
    <Button
      color={Colors.darker}
      title="Send Message"
      onPress={async () => {
        let convo = await Xmtp.newConversation(recipient, 'example.com/1', {});
        await Xmtp.sendMessage(convo.topic, 'Hello World');
      }}
    />
  );
}

/**
 * Show a {@link Button} to configure the current XMTP user.
 */
function ConnectButton({ onConnected }: { onConnected: () => void }) {
  return (
    <Button
      color={Colors.primary}
      // Disable the button if we're already connected.
      title="Connect"
      onPress={async () => {
        let keyBundle = await authWallet(signer as XmtpSigner);
        // TODO: store keyBundle for quick-init next time
        console.log('connected', keyBundle);
        onConnected();
      }}
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
