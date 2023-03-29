# XMTP-REACT-NATIVE

![Lint](https://github.com/xmtp/xmtp-android/actions/workflows/lint.yml/badge.svg) ![Status](https://img.shields.io/badge/Project_Status-Pre--Preview-red)

`xmtp-react-native` provides a React Native implementation of an XMTP message API client for use with Android and iOS apps.

Use `xmtp-react-native` to build with XMTP to send messages between blockchain accounts, including DMs, notifications, announcements, and more.

> **Important:**  
> This SDK is in **Pre-Preview** status and ready for you to start experimenting with.
>
> However, we do **not** recommend using Pre-Preview software in production apps. Software in this status will change as we iterate on features and feedback.
> 
> **Specifically, this SDK currently supports Android plain text messaging only.** We're still working to support iOS and content types beyond plain text.

To keep up with the latest SDK developments, see the [Issues tab](https://github.com/xmtp/xmtp-react-native/issues) in this repo.

To learn more about XMTP and get answers to frequently asked questions, see [FAQ about XMTP](https://xmtp.org/docs/dev-concepts/faq).

![x-red-sm](https://user-images.githubusercontent.com/510695/163488403-1fb37e86-c673-4b48-954e-8460ae4d4b05.png)

## Example apps

For a basic demonstration of the core concepts and capabilities of the `xmtp-react-native` client SDK, see the [example app](https://github.com/xmtp/xmtp-react-native/tree/main/example).

You can run the example app by:

```bash
$ yarn
$ yarn example start
$ yarn example android
```

## Install

```bash
npm install xmtp-react-native
```

## Usage overview

The XMTP message API revolves around a message API client (client) that allows retrieving and sending messages to other XMTP network participants. A client must connect to a wallet app on startup. If this is the very first time the client is created, the client will generate a key bundle that is used to encrypt and authenticate messages. The key bundle persists encrypted in the network using an account signature. The public side of the key bundle is also regularly advertised on the network to allow parties to establish shared encryption keys. All of this happens transparently, without requiring any additional code.

```jsx
import Xmtp from 'xmtp-react-native';

// We are currently working to get Signer working here for now you can pass in a wallet address
const EXAMPLE_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Create the client with your wallet. This will connect to the XMTP `dev` network by default.
// The account is anything that conforms to the `XMTP.SigningKey` protocol.
await Xmtp.configure('dev', EXAMPLE_PRIVATE_KEY);

// Start a conversation with XMTP
let conversation = await Xmtp.newConversation("0x3F11b27F323b62B159D2642964fa27C46C841897");

// Load all messages in the conversation
let messages = await Xmtp.listMessages(conversation.topic);

// Send a message
await Xmtp.sendMessage(conversation.topic, "gm");
```

### Create a client from saved keys

```jsx
import Xmtp from 'xmtp-react-native';

// Create the client with a Private Key soon we will support creating a client with a `Signer`
let client = await Xmtp.configure('production', "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
```

### Configure the client

The client's network connection and key storage method can be configured with these optional parameters of `Client.create`:

| Parameter      | Default               | Description                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| env            | `dev`                 | Connect to the specified XMTP network environment. Valid values include `dev`, `production`, or `local`. For important details about working with these environments, see [XMTP `production` and `dev` network environments](#xmtp-production-and-dev-network-environments).                                                                          

## Handle conversations

Most of the time, when interacting with the network, you'll want to do it through `conversations`. Conversations are between two accounts.

```jsx
import Xmtp from 'xmtp-react-native';
// Create the client with a wallet from your app
await Xmtp.configure('production', "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
let conversations = await Xmtp.listConversations();
```

### List existing conversations

You can get a list of all conversations that have had one or more messages exchanged in the last 30 days.

```jsx
import Xmtp from 'xmtp-react-native';
let allConversations = await Xmtp.listConversations();

for (let i = 0; i < allConversations.length; i++) {
  try await Xmtp.sendMessage(allConversations[i].topic, "gm")
}
```

These conversations include all conversations for a user **regardless of which app created the conversation.** This functionality provides the concept of an [interoperable inbox](https://xmtp.org/docs/dev-concepts/interoperable-inbox), which enables a user to access all of their conversations in any app built with XMTP.

You might choose to provide an additional filtered view of conversations. To learn more, see [Handle multiple conversations with the same blockchain address](#handle-multiple-conversations-with-the-same-blockchain-address) and [Filter conversations using conversation IDs and metadata](https://xmtp.org/docs/client-sdk/javascript/tutorials/filter-conversations).

### Start a new conversation

You can create a new conversation with any Ethereum address on the XMTP network.

```jsx
import Xmtp from 'xmtp-react-native';

let newConversation = await Xmtp.newConversation("0x3F11b27F323b62B159D2642964fa27C46C841897")
```

### Send messages

To be able to send a message, the recipient must have already created a client at least once and consequently advertised their key bundle on the network. Messages are addressed using account addresses. The message payload must be a plain string.

> **Note:**  
> Other types of content are currently not supported.

```jsx
import Xmtp from 'xmtp-react-native';

let conversation = await Xmtp.newConversation("0x3F11b27F323b62B159D2642964fa27C46C841897")
await Xmtp.sendMessage(conversation.topic, "Hello world")
```

### List messages in a conversation

You can receive the complete message history in a conversation by calling `conversation.messages()`

```jsx
import Xmtp from 'xmtp-react-native';

let allConversations = await Xmtp.listConversations();

for (let i = 0; i < allConversations.length; i++) {
    let messagesInConversation = await Xmtp.listMessages(allConversations[i].topic)
}
```

### Handle multiple conversations with the same blockchain address

With XMTP, you can have multiple ongoing conversations with the same blockchain address. For example, you might want to have a conversation scoped to your particular app, or even a conversation scoped to a particular item in your app.

To accomplish this, you can pass a context with a `conversationId` when you are creating a conversation. We recommend conversation IDs start with a domain, to help avoid unwanted collisions between your app and other apps on the XMTP network.

```jsx
import Xmtp from 'xmtp-react-native';

// Start a scoped conversation with ID mydomain.xyz/foo
let conversation1 = await Xmtp.newConversation("0x3F11b27F323b62B159D2642964fa27C46C841897", "mydomain.xyz/foo")

// Start a scoped conversation with ID mydomain.xyz/bar. And add some metadata
let conversation2 = await Xmtp.newConversation("0x3F11b27F323b62B159D2642964fa27C46C841897", "mydomain.xyz/bar", { title: "Bar conversation" })

// Get all the conversations
let conversations = await Xmtp.listConversations()

// Filter for the ones from your app
let myAppConversations = conversations.filter(convo => convo.conversationId.includes('mydomain.xyz/'))
```
 
## 🏗 **Breaking revisions**

Because `xmtp-react-native` is in active development, you should expect breaking revisions that might require you to adopt the latest SDK release to enable your app to continue working as expected.

XMTP communicates about breaking revisions in the [XMTP Discord community](https://discord.gg/xmtp), providing as much advance notice as possible. Additionally, breaking revisions in an `xmtp-react-native` release are described on the [Releases page](https://github.com/xmtp/xmtp-react-native/releases).

## Deprecation

Older versions of the SDK will eventually be deprecated, which means:

1. The network will not support and eventually actively reject connections from clients using deprecated versions.
2. Bugs will not be fixed in deprecated versions.

The following table provides the deprecation schedule.

| Announced  | Effective  | Minimum Version | Rationale                                                                                                         |
| ---------- | ---------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| There are no deprecations scheduled for `xmtp-react-native` at this time. |  |          |  |

Bug reports, feature requests, and PRs are welcome in accordance with these [contribution guidelines](https://github.com/xmtp/xmtp-react-native/blob/main/CONTRIBUTING.md).

## XMTP `production` and `dev` network environments

XMTP provides both `production` and `dev` network environments to support the development phases of your project.

The `production` and `dev` networks are completely separate and not interchangeable.
For example, for a given blockchain account, its XMTP identity on `dev` network is completely distinct from its XMTP identity on the `production` network, as are the messages associated with these identities. In addition, XMTP identities and messages created on the `dev` network can't be accessed from or moved to the `production` network, and vice versa.

**Important:** When you [create a client](#create-a-client), it connects to the XMTP `dev` environment by default. To learn how to use the `env` parameter to set your client's network environment, see [Configure the client](#configure-the-client).

The `env` parameter accepts one of three valid values: `dev`, `production`, or `local`. Here are some best practices for when to use each environment:

- `dev`: Use to have a client communicate with the `dev` network. As a best practice, set `env` to `dev` while developing and testing your app. Follow this best practice to isolate test messages to `dev` inboxes.

- `production`: Use to have a client communicate with the `production` network. As a best practice, set `env` to `production` when your app is serving real users. Follow this best practice to isolate messages between real-world users to `production` inboxes.

- `local`: Use to have a client communicate with an XMTP node you are running locally. For example, an XMTP node developer can set `env` to `local` to generate client traffic to test a node running locally.

The `production` network is configured to store messages indefinitely. XMTP may occasionally delete messages and keys from the `dev` network, and will provide advance notice in the [XMTP Discord community](https://discord.gg/xmtp).
