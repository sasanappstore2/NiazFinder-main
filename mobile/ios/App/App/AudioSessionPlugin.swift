import Foundation
import Capacitor
import AVFAudio

/**
 * In-call audio routing for WebRTC running inside the WebView.
 *
 * Mobile web pages cannot leave the media/loudspeaker channel; this plugin
 * puts the AVAudioSession into the phone-call category so audio goes to the
 * earpiece by default, and lets the UI toggle earpiece ↔ speaker.
 *
 * JS side: `window.Capacitor.Plugins.AudioSession`
 *   configureForCall()            — call once when a call becomes active
 *   setRoute({ route })           — 'earpiece' | 'speaker'
 *   endCall()                     — release the session after hangup
 */
@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configureForCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRoute", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endCall", returnType: CAPPluginReturnPromise),
    ]

    @objc func configureForCall(_ call: CAPPluginCall) {
        do {
            let session = AVAudioSession.sharedInstance()
            // .voiceChat = echo-cancelled, earpiece-routed call audio.
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.allowBluetooth, .allowBluetoothA2DP]
            )
            try session.setActive(true)
            call.resolve()
        } catch {
            call.reject("audio session configure failed: \(error.localizedDescription)")
        }
    }

    @objc func setRoute(_ call: CAPPluginCall) {
        let route = call.getString("route") ?? "earpiece"
        do {
            let session = AVAudioSession.sharedInstance()
            try session.overrideOutputAudioPort(route == "speaker" ? .speaker : .none)
            call.resolve(["route": route])
        } catch {
            call.reject("audio route failed: \(error.localizedDescription)")
        }
    }

    @objc func endCall(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        try? session.overrideOutputAudioPort(.none)
        try? session.setActive(false, options: .notifyOthersOnDeactivation)
        call.resolve()
    }
}
