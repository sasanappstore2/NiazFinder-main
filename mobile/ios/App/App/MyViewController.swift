import UIKit
import Capacitor

/** Registers app-local Capacitor plugins (see AudioSessionPlugin). */
class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AudioSessionPlugin())
    }
}
