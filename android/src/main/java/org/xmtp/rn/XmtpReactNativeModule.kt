package org.xmtp.rn

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

// TODO: implement this using xmtp-android

class XmtpReactNativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  fun configure(env: String, privateKey: String, promise: Promise) {
    promise.reject("unimplemented", "configure() is not implemented")
  }

  @ReactMethod
  fun newConversation(peerAddress: String, promise: Promise) {
    promise.reject("unimplemented", "newConversation() is not implemented")
  }

  @ReactMethod
  fun listConversations(promise: Promise) {
    promise.reject("unimplemented", "listConversations() is not implemented")
  }

  @ReactMethod
  fun listMessages(topic: String, promise: Promise) {
    promise.reject("unimplemented", "listMessages() is not implemented")
  }

  @ReactMethod
  fun sendMessage(topic: String, text: String, promise: Promise) {
    promise.reject("unimplemented", "sendMessage() is not implemented")
  }

  companion object {
    const val NAME = "XmtpReactNative"
  }
}
