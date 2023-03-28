import Foundation
import XMTP
import GRPC
import web3
import XMTPProto

var ApiEnvs = [
    "local": ClientOptions.Api(
        env: XMTPEnvironment.local,
        isSecure: false
    ),
    "dev": ClientOptions.Api(
        env: XMTPEnvironment.dev,
        isSecure: true
    ),
    "production": ClientOptions.Api(
        env: XMTPEnvironment.production,
        isSecure: true
    ),
]

@objc(XmtpReactNative)
class XmtpReactNative: NSObject {
    private var client: Client?
    private var conversationByTopic: [String: Conversation] = [:]

    @objc
    static func requiresMainQueueSetup() -> Bool {
        print("requiresMainQueueSetup()")
        return false
    }

    override init() {
        print("initializing RTNXmtpClient")
        client = nil
    }

    @objc
    func address(_ resolve: @escaping RCTPromiseResolveBlock,
                 reject: @escaping RCTPromiseRejectBlock)
    {
        resolve(client?.address)
    }

    @objc
    func configure(_ env: String,
                   privateKey: String,
                   resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock)
    {
        print("call: configure")
        if client != nil {
            print("client already configured")
            resolve(false)
        }
        Task {
            do {
                // TODO: callback signer instead of raw keys
                let account = try PrivateKey(Data(privateKey.web3.bytesFromHex!))
                let opt = ClientOptions(api: ApiEnvs[env] ?? ApiEnvs["local"]!)
                client = try await Client.create(account: account, options: opt)
                resolve(true)
            } catch {
                reject("misconfig", "Unable to create XMTP client", error)
            }
        }
    }

    @objc
    func newConversation(_ peerAddress: String,
                         conversationId: String,
                         metadata: NSDictionary,
                         resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock)
    {
        print("call: newConversation")
        if client == nil {
            reject("uninitialized", "XMTP client has not been initialized", nil)
            return
        }
        Task {
            do {
                if (conversationID.isEmpty) {
                    let convo = try await client!.conversations.newConversation(with: peerAddress)
                } else {
                    let convo = try await client!.conversations.newConversation(with: peerAddress, context: InvitationV1.Context(conversationID: conversationId, metadata: metadata as? [String:String]))
                }
                conversationByTopic[convo.topic] = convo
                resolve(toJsConversation(conversation: convo))
            } catch {
                reject("req_failed", "Unable to create XMTP conversation", error)
            }
        }    
    }

    @objc
    func listConversations(_ resolve: @escaping RCTPromiseResolveBlock,

                           reject: @escaping RCTPromiseRejectBlock)
    {
        print("call: listConversations")
        if client == nil {
            reject("uninitialized", "XMTP client has not been initialized", nil)
            return
        }
        Task {
            do {
                let convos = try await client!.conversations.list()
                convos.forEach { conversationByTopic[$0.topic] = $0 }
                resolve(convos.map { toJsConversation(conversation: $0) })
            } catch {
                reject("req_failed", "Unable to list XMTP conversations", error)
            }
        }    
    }

    @objc
    func listMessages(_ topic: String,
                      resolve: @escaping RCTPromiseResolveBlock,
                      reject: @escaping RCTPromiseRejectBlock)
    {
        print("call: listMessages")
        if client == nil {
            reject("uninitialized", "XMTP client has not been initialized", nil)
            return
        }
        let convo = conversationByTopic[topic]
        if convo == nil {
            reject("unknown", "unknown conversation topic", nil)
            return
        }
        Task {
            do {
                let messages = try await convo!.messages()
                resolve(messages.map { toJsMessage(message: $0) })
            } catch {
                reject("req_failed", "Unable to list XMTP messages in conversation", error)
            }
        }    
    }

    @objc
    func sendMessage(_ topic: String, text: String,
                     resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock)
    {
        print("call: sendMessage")
        if client == nil {
            reject("uninitialized", "XMTP client has not been initialized", nil)
            return
        }
        let conversation = conversationByTopic[topic]
        if conversation == nil {
            reject("unknown", "unknown conversation topic", nil)
            return
        }
        Task {
            do {
                let messageId = try await conversation!.send(text: text)
                resolve(messageId)
            } catch {
                reject("req_failed", "Unable to send XMTP message", error)
            }
        }    
    }

    // JS Adapters
    func toJsMessage(message: DecodedMessage) -> [String: Any] {
        let text = try! message.content() ?? message.encodedContent.fallback
        return [
            "id": message.id,
            "senderAddress": message.senderAddress,
            "text": text,
        ]
    }

    func toJsConversation(conversation: Conversation) -> [String: Any] {
        return [
            "topic": conversation.topic,
            "peerAddress": conversation.peerAddress,
            "conversationId": conversation.conversationID ?? "",
        ]
    }
}
