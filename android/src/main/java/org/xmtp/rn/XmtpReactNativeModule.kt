package org.xmtp.rn

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import org.web3j.utils.Numeric
import org.xmtp.android.library.Client
import org.xmtp.android.library.ClientOptions
import org.xmtp.android.library.Conversation
import org.xmtp.android.library.DecodedMessage
import org.xmtp.android.library.XMTPEnvironment
import org.xmtp.android.library.messages.PrivateKeyBuilder


val ApiEnvs = mapOf("local" to ClientOptions.Api(env = XMTPEnvironment.LOCAL, isSecure = false), "dev" to ClientOptions.Api(env = XMTPEnvironment.DEV, isSecure = true), "production" to ClientOptions.Api(env = XMTPEnvironment.PRODUCTION, isSecure = true))

class XmtpReactNativeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "XmtpReactNative"

    @ReactMethod fun requiresMainQueueSetup() : Boolean {
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
      val account = PrivateKeyBuilder(PrivateKeyBuilder.buildFromPrivateKeyData(Numeric.hexStringToByteArray(privateKey)))
      val opt = ClientOptions(api = ApiEnvs[env] ?: ApiEnvs["local"]!!)
      client = Client().create(account = account, options = opt)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("misconfig", "Unable to create XMTP client", e)
    }
  }

  @ReactMethod
  fun newConversation(peerAddress: String, promise: Promise) {
    if (client == null) {
      promise.reject("uninitialized", "XMTP client has not been initialized", null)
      return
    }
    try {
      val convo = client!!.conversations.newConversation(peerAddress)
      conversationByTopic[convo.topic] = convo
      promise.resolve(toJsConversation(conversation = convo))
    } catch (e: Exception) {
      promise.reject("req_failed", "Unable to create XMTP conversation", e)
    }
  }

  @ReactMethod
  fun listConversations(promise: Promise) {
    if (client == null) {
      promise.reject("uninitialized", "XMTP client has not been initialized", null)
      return
    }
    try {
      val convos = client!!.conversations.list()
      convos.forEach { conversationByTopic[it.topic] = it }
      promise.resolve(convos.map { toJsConversation(conversation = it) })
    } catch (e: Exception) {
      promise.reject("req_failed", "Unable to list XMTP conversations", e)
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
      promise.reject("req_failed", "Unable to list XMTP messages in conversation", e)
    }
  }

  @ReactMethod
  fun sendMessage(topic: String, text: String, promise: Promise) {
    print("call: sendMessage")
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
      promise.reject("req_failed", "Unable to send XMTP message", e)
    }
  }

  // JS Adapters
  private fun toJsMessage(message: DecodedMessage) : Map<String, Any> {
    // Change this back to message.encodedContent.fallback
    val text = message.content() ?: message.encodedContent
    return mapOf("id" to message.id, "senderAddress" to message.senderAddress, "text" to text)
  }

  // TODO: consider other content types, etc
  private fun toJsConversation(conversation: Conversation) : Map<String, Any?> =
    mapOf("topic" to conversation.topic, "peerAddress" to conversation.peerAddress, "conversationId" to conversation.conversationId)

}
