package org.xmtp.rn

import android.util.Log
import com.facebook.react.bridge.*
import com.google.protobuf.ByteString
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.web3j.crypto.ECKeyPair
import org.web3j.crypto.Hash
import org.web3j.crypto.Sign
import org.web3j.utils.Numeric
import org.xmtp.android.library.*
import org.xmtp.android.library.messages.*
import org.xmtp.proto.message.contents.Invitation.InvitationV1.Context
import java.security.SecureRandom

val Configs = mapOf(
  "local" to ClientOptions.Api(env = XMTPEnvironment.LOCAL, isSecure = false),
  "dev" to ClientOptions.Api(env = XMTPEnvironment.DEV, isSecure = true),
  "production" to ClientOptions.Api(env = XMTPEnvironment.PRODUCTION, isSecure = true)
)

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

  // This is constructed during {@link configure()}
  private var api: ApiClient? = null

  // This is constructed during {@link init()}
  private var client: Client? = null

  // This is populated whenever we see a new conversation
  // We hold onto the instance so we can reference it by topic.
  private val conversationByTopic: MutableMap<String, Conversation> = mutableMapOf()

  // We use this to launch all our method handlers in the IO scope.
  // See {@link #withPromise}
  private val ioScope = CoroutineScope(Dispatchers.IO)

  override fun getName(): String = NAME

  @ReactMethod
  fun address(promise: Promise) = promise.resolve(client?.address)

  @ReactMethod
  fun configure(env: String, promise: Promise) {
    withPromise(promise, "configure XMTP") {
      check(api == null) { "already configured" }
      val cfg = Configs[env]!!
      api = GRPCApiClient(cfg.env, cfg.isSecure)
      true
    }
  }

  @ReactMethod
  fun authCheck(address: String, promise: Promise) {
    withPromise(promise, "authCheck") {
      checkNotNull(api) { "not configured" }
      // TODO: consider better logic to select the best savedAuth when there are multiple
      val savedAuth = Client.authCheck(api!!, address).firstOrNull()
      val res = WritableNativeMap()
      res.putBoolean("hasSavedAuth", savedAuth != null)
      if (savedAuth != null) {
        // For a saved account, we prompt them to load it (and hang onto the savedAuth context).
        // See #authLoad
        res.putString("loadPrompt", makePromptEnable(savedAuth.v1.walletPreKey.toByteArray()))
        res.putString("loadContext", toHexString(savedAuth.toByteArray()))
      } else {
        // For a new account, we prompt them to create it (and hang onto the new key context).
        // See #authCreate
        val identityKey = generateUnsignedPrivateKey()
        res.putString("createPrompt", makePromptCreate(identityKey.publicKey))
        res.putString("createContext", toHexString(identityKey.toByteArray()))
      }
      res
    }
  }

  @ReactMethod
  fun authCreate(
    address: String,
    createPromptSigned: String,
    createContext: String,
    promise: Promise
  ) {
    withPromise(promise, "authCreate") {
      checkNotNull(api) { "not configured" }
      // First assemble the identityKey and attach the signature.
      val identityKey = PrivateKey.parseFrom(toByteArray(createContext)).toBuilder().apply {
        publicKeyBuilder.signature = toWalletSignature(createPromptSigned)
      }.build()

      // Then use the identityKey to authorize a newly generated preKey
      val preKey = generateUnsignedPrivateKey().toBuilder().apply {
        publicKeyBuilder.signature =
          signWithKey(signer = identityKey, toBeSigned = Hash.sha256(publicKey.toByteArray()))
      }.build()

      // Now pack the identityKey and the preKey into a bundle
      val keyBundle = PrivateKeyBundle.newBuilder().apply {
        v1Builder.identityKey = identityKey
        v1Builder.addPreKeys(preKey)
      }.build()

      val res = WritableNativeMap()
      res.putString("keyBundle", toHexString(keyBundle.toByteArray()))

      // Generate the bits they'll sign and we'll use to encrypt during authSave()
      val walletPreKey = SecureRandom().generateSeed(32)
      res.putString("savePrompt", makePromptEnable(walletPreKey))
      res.putString("saveContext", toHexString(walletPreKey))

      res
    }
  }

  @ReactMethod
  fun authLoad(loadPromptSigned: String, loadContext: String, promise: Promise) {
    withPromise(promise, "authLoad") {
      checkNotNull(api) { "not configured" }
      val savedAuth = EncryptedPrivateKeyBundle.parseFrom(toByteArray(loadContext))
      val sig = toByteArray(loadPromptSigned)
      val keyBundle = Crypto.decrypt(sig, savedAuth.v1.ciphertext)!!

      toHexString(keyBundle)
    }
  }

  @ReactMethod
  fun authSave(keyBundle: String, savePromptSigned: String, saveContext: String, promise: Promise) {
    withPromise(promise, "authSave") {
      checkNotNull(client) { "not initialized" }
      val bundle = PrivateKeyBundle.parseFrom(toByteArray(keyBundle))
      val sig = toByteArray(savePromptSigned)
      val walletPreKey = ByteString.copyFrom(toByteArray(saveContext))
      val encrypted = Crypto.encrypt(sig, bundle.toByteArray())
      val savedAuth = EncryptedPrivateKeyBundle.newBuilder()
      savedAuth.v1 = savedAuth.v1Builder
        .setWalletPreKey(walletPreKey)
        .setCiphertext(encrypted)
        .build()

      Client.authSave(api!!, bundle, savedAuth.build())
      true
    }
  }

  @ReactMethod
  fun init(keyBundle: String, promise: Promise) {
    withPromise(promise, "init") {
      check(client == null) { "already initialized" }
      val bundle = PrivateKeyBundle.parseFrom(toByteArray(keyBundle))
      val bundleV1 = if (bundle.hasV1()) bundle.v1 else bundle.v2.toV1()
      val address = bundleV1.toPublicKeyBundle().walletAddress

      client = Client(address, bundle.v1, api!!)
      true
    }
  }

  @ReactMethod
  fun newConversation(
    peerAddress: String,
    conversationId: String,
    metadata: ReadableMap,
    promise: Promise,
  ) {
    withPromise(promise, "newConversation") {
      checkNotNull(client) { "not initialized" }
      val convo = client!!.conversations.newConversation(
        peerAddress, Context.newBuilder()
          .setConversationId(conversationId)
          .putAllMetadata(toStringMap(metadata))
          .build()
      )
      conversationByTopic[convo.topic] = convo
      toJsConversation(convo)
    }
  }

  @ReactMethod
  fun listConversations(promise: Promise) {
    withPromise(promise, "listConversations") {
      checkNotNull(client) { "not initialized" }
      val conversations = client!!.conversations.list()
      val res = WritableNativeArray()
      conversations.forEach {
        conversationByTopic[it.topic] = it
        res.pushMap(toJsConversation(it))
      }
      res
    }
  }

  @ReactMethod
  fun listMessages(topic: String, promise: Promise) {
    withPromise(promise, "listMessages") {
      checkNotNull(client) { "not initialized" }
      val conversation = conversationByTopic[topic]
      checkNotNull(conversation) { "unknown conversation topic" }
      val messages = conversation.messages()
      val res = WritableNativeArray()
      messages.forEach { res.pushMap(toJsMessage(it)) }
      res
    }
  }

  @ReactMethod
  fun sendMessage(topic: String, text: String, promise: Promise) {
    withPromise(promise, "sendMessage") {
      checkNotNull(client) { "not initialized" }
      val conversation = conversationByTopic[topic]
      checkNotNull(conversation) { "unknown conversation topic" }
      conversation.send(text)
      true
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

  /// Helpers

  // "0x010203..." -> [1, 2, 3, ...]
  private fun toByteArray(s: String): ByteArray = Numeric.hexStringToByteArray(s)

  // [1, 2, 3, ...] -> "0x010203..."
  private fun toHexString(bytes: ByteArray): String = Numeric.toHexString(bytes)

  // Convert RN native map to an ordinary java map of strings.
  private fun toStringMap(metadata: ReadableMap): Map<String, String> {
    val keys = metadata.keySetIterator()
    val res = hashMapOf<String, String>()
    while (keys.hasNextKey()) {
      val k = keys.nextKey()
      res[k] = metadata.getString(k)!!
    }
    return res
  }

  // Create a {@link Signature} from the hex string of the prompt signature.
  private fun toWalletSignature(promptSigned: String): Signature =
    SignatureBuilder.buildFromSignatureData(toByteArray(promptSigned))

  // Create a {@link Signature} of the bytes signed by the {@param signer}.
  private fun signWithKey(signer: PrivateKey, toBeSigned: ByteArray): Signature {
    val sigData = Sign.signMessage(
      toBeSigned,
      ECKeyPair.create(signer.secp256K1.bytes.toByteArray()),
      false
    )
    val sigBytes = KeyUtil.getSignatureBytes(sigData)
    return SignatureBuilder.buildFromSignatureData(sigBytes)
  }

  // Generate a random private key that does not have an authorizing signature on its public key.
  // This is used to generate the identity and pre keys before they are signed.
  private fun generateUnsignedPrivateKey(): PrivateKey =
    PrivateKeyBuilder.buildFromPrivateKeyData(SecureRandom().generateSeed(32))

  // Generate the prompt for the user to sign to create a new identity key.
  private fun makePromptCreate(identityPublicKey: PublicKey): String =
    Signature.getDefaultInstance().createIdentityText(identityPublicKey.toByteArray())

  // Generate the prompt for the user to sign to enable loading/saving encrypted key bundles.
  private fun makePromptEnable(walletPreKey: ByteArray): String =
    Signature.getDefaultInstance().enableIdentityText(walletPreKey)

  /**
   * Resolve the {@param promise} with the trailing {@param closure}.
   *
   * The closure is launched as a coroutine in the {@link #ioScope}.
   *
   * It resolves the {@param promise} using the result.
   * Or it rejects the {@param promise} with any failures.
   *
   * The {@param name} is used to identify the source of any errors.
   */
  private fun withPromise(promise: Promise, name: String, closure: suspend () -> Any?) {
    Log.v("Xmtp", "-> $name request")
    ioScope.launch {
      try {
        val result = closure()
        promise.resolve(result)
        Log.v("Xmtp", "<- $name success")
      } catch (e: Throwable) {
        e.printStackTrace()
        promise.reject("xmtp/error", "XMTP $name failure: ${e.message}")
        Log.v("Xmtp", "<- $name failure")
      }
    }
  }
}
