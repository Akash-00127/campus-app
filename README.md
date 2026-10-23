# Campus Drop mobile

Expo 57 + React Native + Expo Router + TypeScript. One application with student and vendor roles, sharing the NestJS API with the admin panel.

Copy .env.example to .env and set EXPO_PUBLIC_API_URL. The default 10.0.2.2 address targets the host computer from an Android emulator. A physical phone needs the backend computer's reachable LAN address. Run npm ci, then npm start. Production uses HTTPS.

Student: verified campus catalog, product details, single-shop cart, COD checkout, addresses, order timeline, delivery PIN, profile, inbox and support.
Vendor: pending-approval onboarding, profile and daily overnight hours, product/stock management, own orders, seller delivery and separate cash collection.

For Android Firebase push, set GOOGLE_SERVICES_JSON to the native Firebase config path and build a native development/release app. Enable notifications in Account on a real device. Backend service-account credentials belong only on the backend. iOS native push is not configured; the in-app inbox works independently.

Validation: npx tsc --noEmit; npx expo export --platform android --output-dir .build/android --max-workers 2.
See ../campus backend/README.md for complete setup, first-order instructions and outstanding production work.
