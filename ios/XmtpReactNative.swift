import Foundation

// TODO: implement this using xmtp-ios

@objc(XmtpReactNative)
class XmtpReactNative: NSObject {

    @objc
    func configure(_ env: String,
                   privateKey: String,
                   resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock)
    {
        reject("unimplemented", "configure() is not implemented", nil)
    }

    @objc
    func newConversation(_ peerAddress: String,
                         conversationId: String,
                         metadata: NSDictionary,
                         resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock)
    {
        reject("unimplemented", "newConversation() is not implemented", nil)
    }

    @objc
    func listConversations(_ resolve: @escaping RCTPromiseResolveBlock,

                           reject: @escaping RCTPromiseRejectBlock)
    {
        reject("unimplemented", "listConversations() is not implemented", nil)
    }

    @objc
    func listMessages(_ topic: String,
                      resolve: @escaping RCTPromiseResolveBlock,
                      reject: @escaping RCTPromiseRejectBlock)
    {
        reject("unimplemented", "listMessages() is not implemented", nil)
    }

    @objc
    func sendMessage(_ topic: String, text: String,
                     resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock)
    {
        reject("unimplemented", "sendMessage() is not implemented", nil)
    }
}
