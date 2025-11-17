# Syllabye Frontend

React Native mobile app (Expo) that provides the Syllabye chat and calendar UI.

## Technologies

- **React Native + Expo** – cross-platform mobile UI for iOS/Android
- **TypeScript** – typed components, hooks, and API helpers
- **React Navigation** – tab navigation between Syllabus, Calendar, and Syl AI screens
- **Context API (AppContext)** – stores auth session, classes, and user state across screens
- **Fetch API** – REST calls for auth, classes, syllabi, and events
- **WebSockets** – streaming chat and tool-call events from the backend (`/chat/ws`)
- **FastAPI backend** – consumed via `src/api.ts` using `API_BASE_URL`

## Chat & Streaming

The `SylAiScreen` uses helpers from `src/api.ts`:

- `streamChatMessageWs` – primary WebSocket-based streaming chat
  - Streams text chunks for the assistant message
  - Streams structured tool-call events so the UI can show live tasks
- `streamChatMessage` – HTTP streaming fallback when WebSockets are unavailable

The Syl AI UI shows:

- Incremental assistant responses as text streams in
- A small task strip at the top of the chat listing tools the agent is running (e.g. `list_classes`, `create_event`)
- An inline `...` assistant bubble while the model is thinking before text arrives

## Auth & Logout

Authentication is handled by `AppContext`:

- Persists JWT and user profile via AsyncStorage
- Exposes `setSession` and `logout`
- The Syl AI screen has a small circular logout button in the header that calls `logout()`

## Local Development

1. Start the backend API (see `../Syllabye-backend/README.md`).
2. In this folder, install dependencies and run the app with Expo:

   ```bash
   npm install
   npm run start
   ```

3. Use the Expo CLI to open the app on an iOS simulator or device and point it at the running backend.
