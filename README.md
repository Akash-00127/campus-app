# Campus Drop mobile

Expo 58 + React Native + Expo Router + TypeScript. One application with student and vendor roles, sharing the NestJS API with the admin panel.

Copy .env.example to .env. Leave EXPO_PUBLIC_API_URL empty to use Expo's development host on port 4000 automatically. This follows the computer's LAN address when Wi-Fi changes. An Android emulator without an Expo host falls back to 10.0.2.2. Set an explicit URL for a remote backend. A physical phone must be on the same network as the backend computer. Run npm ci, then npm start. Production uses HTTPS.

For browser development, run npm run web and open http://localhost:8082. This port matches the backend Docker CORS allowlist. EXPO_PUBLIC_WEB_API_URL defaults to http://localhost:4000/v1. The backend must be running and allow requests from the web development origin. On the iOS simulator, set EXPO_PUBLIC_API_URL to http://localhost:4000/v1. Restart Expo after changing environment variables. Native iOS builds require macOS; web and Android development work on Windows.

Student: verified campus catalog, product details, single-shop cart, COD checkout, addresses, order timeline, delivery PIN, profile, inbox and support.
Vendor: pending-approval onboarding, profile and daily overnight hours, product/stock management, own orders, seller delivery and separate cash collection.

For Android Firebase push, set GOOGLE_SERVICES_JSON to the native Firebase config path and build a native development/release app. Enable notifications in Account on a real device. Backend service-account credentials belong only on the backend. iOS native push is not configured; the in-app inbox works independently.

Validation: npm run check runs TypeScript and the runtime tests. npm run export generates Android, iOS and web bundles under .build/export. Use npx expo install --check and npx expo-doctor to check dependency compatibility and configuration.
See ../Campus-Backend/README.md for complete setup, first-order instructions and outstanding production work.

