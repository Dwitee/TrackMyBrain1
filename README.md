This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

# TrackMyBrain 🧠

An **offline, on-device personal memory assistant** built with **React Native** and powered by **Cactus Compute** local LLMs. 

TrackMyBrain lets you:
- Ask questions to a fully local AI model (Qwen 0.6 / Liquid)
- Save thoughts as memories
- View your recent memories in a timeline
- All data stays **private** and **on your device**

This project is built for the **Cactus Mobile Agent Hackathon**.

---

## 🚀 Features

- **Offline LLM** using `cactus-react-native`
- **Local memory storage** with AsyncStorage
- **Ask → Answer → Save as Memory** flow
- **Timeline view** of recent memories
- Fully private — nothing leaves the device

Upcoming (in progress):
- Embeddings + Local RAG recall
- Snap Memory (Vision)
- Voice Memory (STT/TTS)
- Day-End Summary
- Apple-Health-style UI

---

## 🛠️ Requirements
Make sure your environment is set up:

- Node.js 18+
- Xcode (for iOS builds)
- CocoaPods installed (`sudo gem install cocoapods`)
- iOS Simulator or a physical device

Follow the official RN guide if needed: https://reactnative.dev/docs/set-up-your-environment

---

## 📦 Installation

Clone the repo:
```sh
git clone <your-repo-url>
cd TrackMyBrain
```

Install dependencies:
```sh
npm install
```

Install Cactus SDK + dependencies:
```sh
npm install cactus-react-native react-native-nitro-modules
npm install @react-native-async-storage/async-storage
```

Install iOS pods:
```sh
cd ios
pod install
cd ..
```

---

## ▶️ Running the App

Start Metro:
```sh
npm start
```

In another terminal, run iOS:
```sh
npm run ios
```

The app will launch in the simulator.

---

## 🤖 Model Download (Important)

On first run, Cactus will download a small on-device model (~200MB). 

You will see a progress indicator:
```
Downloading model: 32%
```

After the first download, the model is cached and **the app works fully offline**.

---

## 🧠 Using the App

1. Type a question
2. Tap **Ask TrackMyBrain**
3. When the answer appears, tap **Save as Memory**
4. Scroll down to see it appear in the **Recent Memories** timeline

All memories are stored locally in AsyncStorage.

---

## 📁 Project Structure

```
src/
  ai/                # Local-RAG, embeddings (coming soon)
  db/
    memoryDb.ts     # AsyncStorage memory database
  screens/
    HomeScreen.tsx  # Main UI
```

---

## 🔧 Troubleshooting

**Stuck at model download?**
- Make sure you have internet for the first run.
- Restart Metro: `npm start --reset-cache`.

**iOS build errors?**
```sh
cd ios
pod install
cd ..
```

**App crashes with expo-modules-core errors?**
- You installed Expo-sqlite or Expo-asset in a bare RN project.
- Ensure these are removed (we use AsyncStorage instead):
```sh
npm uninstall expo-sqlite expo-asset
```

---

## 📜 License
MIT

---

## 🙌 Hackathon Notes
This project follows the hackathon guidelines:
- Uses small local models
- Offline-first approach
- Designed for fast iteration
- Clean architecture for adding Vision/STT/RAG next

Enjoy hacking! 🧠⚡
# TrackMyFood 🍎🔥  
An **AI‑powered on‑device diet & fitness companion** built with **React Native** + **Cactus Compute**.  
TrackMyFood helps you **photograph food**, **log meals**, **analyze macros**, and **view daily calorie summaries** — all **offline**, fully **on your device**.

Built for the **Cactus Mobile Agent Hackathon**.

---

# 🚀 Features

### 🍽️ Food Logging (Vision AI)
- Take photos of meals  
- On‑device LLM analyzes food  
- Extracts estimated calories & macros  
- Fallback macro & calorie estimates (100–400 kcal)

### 🎤 Voice Notes (Speech-to-Text)
- Record voice notes about meals  
- Whisper‑small runs locally via Cactus STT  
- Transcribe and save as food memories

### 📊 Daily Summary Dashboard
- Calorie intake vs calorie burn  
- Macro breakdown (protein / carbs / fats)  
- Streak tracking + motivational badges  
- Apple Health–style aesthetic

### 🧠 Local Memory Store (RAG-ready)
- All meals saved locally (SQLite soon)  
- Rewrite prompts & summaries stored  
- Will support embeddings + retrieval queries like:  
  **“How many calories have I eaten today?”**

### 🔒 100% On‑Device & Private
No cloud.  
No server.  
Everything stays on your iPhone.

---

# 🛠 Requirements

- Node.js 18+  
- Xcode (for iOS builds on Mac)  
- CocoaPods  
- iOS Simulator or physical device  
- Cactus SDK installed locally

---

# 📦 Installation

Clone the repo:

```sh
git clone <your-repo-url>
cd TrackMyFood
```

Install dependencies:

```sh
npm install
npm install cactus-react-native react-native-nitro-modules
npm install @react-native-async-storage/async-storage
```

Install iOS pods:

```sh
cd ios
pod install
cd ..
```

---

# ▶️ Running the App

Start Metro:

```sh
npm start
```

Then:

```sh
npm run ios
```

The app will launch in the simulator or on your connected iPhone.

---

# 📱 Using TrackMyFood

### 🍽️ Log Meals with Vision
1. Tap **Vision Notes**
2. Take a photo of your food  
3. App analyzes macros & calories  
4. Saves the meal automatically  

### 🎤 Log Meals via Voice
1. Go to **Voice Notes**  
2. Tap the 🎙️ mic to record  
3. Whisper STT transcribes locally  
4. Save the note as a food memory  

### 📊 View Daily Summary
- Tap **Daily Summary & Trends**  
- See:  
  - Intake vs burn  
  - Macro pie/stacks  
  - Net calories  
  - Streaks & badges  

### 🧠 Ask TrackMyFood (Health Plan)
In the Home Screen:

Default prompt:  
**“Using my step count & meals today, make me a calorie‑deficit plan to lose 1kg/month.”**

TrackMyFood responds and stores your plan.

---

# 📁 Project Structure

```
src/
  ai/                  # (coming soon) embeddings + local RAG
  db/
    memoryDb.ts        # memory storage
  screens/
    HomeScreen.tsx
    VisionNotesScreen.tsx
    VoiceNotesScreen.tsx
    SummaryScreen.tsx
  navigation/
    RootNavigator.tsx
```

---

# 🔧 Troubleshooting

### Model download stuck?
Run:
```sh
npm start --reset-cache
```

### iOS build error?
```sh
cd ios
pod install
cd ..
```

### App crashing after camera?
Ensure `NSCameraUsageDescription` exists in Info.plist.

---

# 🏆 Hackathon Notes

TrackMyFood follows hackathon requirements:

- On-device **Vision AI**
- On-device **Speech-to-Text**
- Offline-first architecture
- Uses small, fast **Qwen 0.6** and **whisper-small**
- Beautiful, production-level UI with emoji interactions
- Summary analytics dashboard

---

# 📜 License
MIT