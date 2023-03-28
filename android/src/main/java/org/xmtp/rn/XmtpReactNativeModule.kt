package org.xmtp.rn

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableNativeMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import org.web3j.utils.Numeric
import org.xmtp.android.library.Client
import org.xmtp.android.library.ClientOptions
import org.xmtp.android.library.Conversation
import org.xmtp.android.library.DecodedMessage
import org.xmtp.android.library.XMTPEnvironment
import org.xmtp.android.library.messages.PrivateKeyBuilder


val ApiEnvs = mapOf("local" to ClientOptions.Api(env = XMTPEnvironment.LOCAL, isSecure = false),
  "dev" to ClientOptions.Api(env = XMTPEnvironment.DEV, isSecure = true),
  "production" to ClientOptions.Api(env = XMTPEnvironment.PRODUCTION, isSecure = true))

class XmtpReactNativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "XmtpReactNative"

    @ReactMethod
    fun requiresMainQueueSetup(): Boolean {
      print("requiresMainQueueSetup()")
      return false
    }
  }

  private var client: Client? = null
  private val conversationByTopic: MutableMap<String, Conversation> = mutableMapOf()

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  fun configure(env: String, privateKey: String, promise: Promise) {
    if (client != null) {
      promise.resolve(false)
    }
    try {
      // TODO: callback signer instead of raw keys
      val account =
        PrivateKeyBuilder(PrivateKeyBuilder.buildFromPrivateKeyData(Numeric.hexStringToByteArray(
          privateKey)))
      val opt = ClientOptions(api = ApiEnvs[env] ?: ApiEnvs["local"]!!)
      client = Client().create(account = account, options = opt)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("misconfig", "Unable to create XMTP client ${e.message}", e)
    }
  }

  @ReactMethod
  fun newConversation(
    peerAddress: String,
    conversationId: String,
    metadata: ReadableMap,
    promise: Promise,
  ) {
    if (client == null) {
      promise.reject("uninitialized", "XMTP client has not been initialized", null)
      return
    }
    try {
      val convo = client!!.conversations.newConversation(peerAddress)
      conversationByTopic[convo.topic] = convo
      promise.resolve(toJsConversation(conversation = convo))
    } catch (e: Exception) {
      promise.reject("req_failed", "Unable to create XMTP conversation ${e.message}", e)
    }
  }

  @ReactMethod
  fun listConversations(promise: Promise) {
    if (client == null) {
      promise.reject("uninitialized", "XMTP client has not been initialized", null)
      return
    }
    try {
      val conversations = client!!.conversations.list()
      val res = WritableNativeArray()
      conversations.forEach {
        conversationByTopic[it.topic] = it
        res.pushMap(toJsConversation(conversation = it))
      }
      promise.resolve(res)
    } catch (e: Exception) {
      promise.reject("req_failed", "Unable to list XMTP conversations ${e.message}", e)
    }
  }

  @ReactMethod
  fun listMessages(topic: String, promise: Promise) {
    if (client == null) {
      promise.reject("uninitialized", "XMTP client has not been initialized", null)
      return
    }
    val convo = conversationByTopic[topic]
    if (convo == null) {
      promise.reject("unknown", "unknown conversation topic", null)
      return
    }
    try {
      val messages = convo.messages()
      promise.resolve(messages.map { toJsMessage(message = it) })
    } catch (e: Exception) {
      promise.reject("req_failed", "Unable to list XMTP messages in conversation ${e.message}", e)
    }
  }

  @ReactMethod
  fun sendMessage(topic: String, text: String, promise: Promise) {
    if (client == null) {
      promise.reject("uninitialized", "XMTP client has not been initialized", null)
      return
    }
    val conversation = conversationByTopic[topic]
    if (conversation == null) {
      promise.reject("unknown", "unknown conversation topic", null)
      return
    }
    try {
      val messageId = conversation.send(text = text)
      promise.resolve(messageId)
    } catch (e: Exception) {
      promise.reject("req_failed", "Unable to send XMTP message ${e.message}", e)
    }
  }

  private fun toJsMessage(message: DecodedMessage): ReadableNativeMap {
    val text = message.content() ?: message.encodedContent.fallback
    val nativeMap = WritableNativeMap()
    nativeMap.putString("id", message.id)
    nativeMap.putString("senderAddress", message.senderAddress)
    nativeMap.putString("text", text)

    return nativeMap
  }

  private fun toJsConversation(conversation: Conversation): ReadableNativeMap {
    val nativeMap = WritableNativeMap()
    nativeMap.putString("topic", conversation.topic)
    nativeMap.putString("peerAddress", conversation.peerAddress)
    nativeMap.putString("conversationId", conversation.conversationId)

    return nativeMap
  }
}
