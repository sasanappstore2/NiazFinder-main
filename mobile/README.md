# NiazFinder Native Wrapper (Capacitor)

اپ نیتیو iOS که سایت زندهٔ نیازفایندر را داخل WebView بارگذاری می‌کند و از طریق
پلاگین سوییفت `AudioSession`، صدای تماس WebRTC را به کانال «مکالمهٔ تلفنی» سیستم‌عامل
می‌برد — یعنی گوشیِ بالای صفحه (earpiece) به‌صورت پیش‌فرض، و دکمهٔ بلندگوی واقعی در UI تماس.

## معماری

- `capacitor.config.ts` — اپ، سایت را از `server.url` بارگذاری می‌کند (بدون static export).
  - dev: `https://192.168.254.3:8443` (پروکسی Caddy روی مک — باید روشن باشد)
  - production: با `NIAZ_APP_URL=https://niazfinder.com npx cap sync ios` عوض کنید
- `ios/App/App/AudioSessionPlugin.swift` — پلاگین سفارشی:
  `configureForCall()` (playAndRecord + voiceChat → earpiece پیش‌فرض)،
  `setRoute({route: 'earpiece'|'speaker'})`، `endCall()`
- `ios/App/App/MyViewController.swift` — ثبت پلاگین (در Main.storyboard به‌عنوان
  کلاس ViewController تنظیم شده)
- سمت وب (در اپ اصلی Next):
  - `src/lib/voice/native-audio-route.ts` — پل JS؛ خارج از اپ نیتیو no-op است
  - `call-controller.ts` — با active شدن تماس `configureForCall`، با پایان `endCall`
  - `VoiceCallOverlay.tsx` — دکمهٔ بلندگو حالا واقعاً مسیر صدا را عوض می‌کند

## اجرا (نیاز به Xcode کامل از App Store)

```bash
# ۱. اگر Xcode تازه نصب شد:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# ۲. باز کردن پروژه
cd mobile && npx cap open ios

# ۳. در Xcode: انتخاب تیم Signing (Apple ID شخصی کافی است) → انتخاب آیفون → Run
```

نکته‌ها:
- برای dev روی LAN: پروکسی Caddy باید روشن باشد و پروفایل mkcert روی آیفون نصب/معتمد.
- بعد از هر تغییر در `capacitor.config.ts`: `npx cap sync ios`
- اندروید بعداً: `npm i @capacitor/android && npx cap add android` + معادل کاتلین پلاگین.
