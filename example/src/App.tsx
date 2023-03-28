import * as React from 'react';

import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  FlatList,
  Button,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Xmtp, {
  Conversation,
  ConversationTopic,
  Message,
} from 'xmtp-react-native';
import { useMemo, useState } from 'react';

// This private key is the connected user. Don't do this in a real app.
// TODO: support deferred signing callbacks instead of raw keys
const EXAMPLE_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
// Address = 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 to message it.
// Incidentally, this key is the ephemeral hardhat account #0
// https://hardhat.org/hardhat-network/docs/overview#running-stand-alone-in-order-to-support-wallets-and-other-software

export default function App() {
  const [isConnected, setConnected] = useState(false);
  const [topic, setTopic] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  useMemo(async () => {
    if (!isConnected) {
      return;
    }
    setConversations(await Xmtp.listConversations());
  }, [isConnected]);

  return (
    <SafeAreaView style={{ backgroundColor: Colors.darker }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darker} />
      {isConnected ? (
        <FlatList
          data={conversations}
          renderItem={({ item }) => (
            <ConversationItem
              topic={item.topic}
              peerAddress={item.peerAddress}
              onPress={() => setTopic(item.topic)}
            />
          )}
          keyExtractor={(item) => item.topic}
        />
      ) : (
        <Button
          color={Colors.primary}
          title="Connect"
          onPress={() =>
            Xmtp.configure('local', EXAMPLE_PRIVATE_KEY)
              .then(() => setConnected(true))
              .catch((err) => console.error(err.stack))
          }
        />
      )}
      <ConversationModal topic={topic} onClose={() => setTopic('')} />
    </SafeAreaView>
  );
}

function ConversationItem({
  topic,
  peerAddress,
  onPress,
}: {
  topic: string;
  peerAddress: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.conversationItemContainer}
    >
      <Text style={styles.conversationItemPeer}>
        {abbreviateAddress(peerAddress)}
      </Text>
      <Text style={styles.conversationItemTopic}>{topic}</Text>
    </TouchableOpacity>
  );
}

function ConversationModal({
  topic,
  onClose,
}: {
  topic: ConversationTopic;
  onClose: () => void;
}) {
  let [messages, setMessages] = useState<Message[]>([]);
  useMemo(async () => {
    if (!topic) {
      setMessages([]);
    } else {
      setMessages(await Xmtp.listMessages(topic));
    }
  }, [topic]);
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

function abbreviateAddress(addr: string) {
  if ((addr ?? '').length < 6) {
    return addr;
  }
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
