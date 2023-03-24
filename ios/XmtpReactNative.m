#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(XmtpReactNative, NSObject)

RCT_EXTERN_METHOD(configure:(NSString *)env
                  privateKey:(NSString *)String
                  resolve:(RCTPromiseResolveBlock *)resolve
                  reject:(RCTPromiseRejectBlock *)reject)

RCT_EXTERN_METHOD(newConversation:(NSString *)peerAddress
                  resolve:(RCTPromiseResolveBlock *)resolve
                  reject:(RCTPromiseRejectBlock *)reject)

RCT_EXTERN_METHOD(listConversations:(RCTPromiseResolveBlock *)resolve
                  reject:(RCTPromiseRejectBlock *)reject)

RCT_EXTERN_METHOD(listMessages:(NSString *)topic
                  resolve:(RCTPromiseResolveBlock *)resolve
                  reject:(RCTPromiseRejectBlock *)reject)

RCT_EXTERN_METHOD(sendMessage:(NSString *)topic
                  text:(NSString *)text
                  resolve:(RCTPromiseResolveBlock *)resolve
                  reject:(RCTPromiseRejectBlock *)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
