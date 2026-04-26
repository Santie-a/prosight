# Prosight Frontend

React Native frontend for the Prosight low-vision accessibility application, built with Expo. Provides intuitive interfaces for document processing, vision analysis, and text-to-speech features.

## Features

- **Document Management**: View, upload, and organize PDF documents
- **Vision Analysis**: Capture and analyze images with AI-powered insights
- **Text-to-Speech**: Listen to document and analysis content with high-quality audio
- **Accessibility**: Built-in accessibility features for low-vision users
- **Cross-Platform**: Native apps for iOS, Android, and web

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: React Context & Hooks
- **Navigation**: Expo Router (file-based routing)
- **Storage**: SQLite (local database via Expo)
- **API Client**: Fetch API with custom hooks
- **Build Tools**: Expo CLI

## Requirements

- Node.js >= 16
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator (for local development)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (if needed):
   - Backend API URL is typically configured in `constants/config.ts`

## Running the App

```bash
# Start the development server
npx expo start

# From the output, press:
# 'i' for iOS Simulator
# 'a' for Android Emulator
# 'w' for web browser
# 's' to switch to Expo Go (scan QR code with Expo Go app)
```

### Development Build

For features requiring native modules, create a development build:

```bash
npx expo run:ios      # or run:android
```

### Production Build

```bash
# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Build for Android (requires Google Play Developer account)
eas build --platform android
```

## Project Structure

```
frontend/
├── app/                   # App screens and routing (Expo Router)
│   ├── (tabs)/            # Tabbed navigation structure
│   │   ├── documents.tsx  # Document browser and management
│   │   ├── vision.tsx     # Vision analysis screen
│   │   └── settings.tsx   # Settings and configuration
│   └── _layout.tsx        # Root navigation layout
├── components/            # Reusable UI components
│   ├── ui/                # Base UI components
│   │   ├── Button.tsx     # Custom button component
│   │   ├── Text.tsx       # Custom text with theme support
│   │   ├── AudioPlayer.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── AnalysisResult.tsx # Vision analysis results display
│   ├── DocumentsList.tsx  # Document list component
│   ├── PDFUploadScreen.tsx
│   ├── ImagePreview.tsx
│   ├── ReaderView.tsx     # Document reader component
│   └── SectionsMenu.tsx
├── hooks/                 # Custom React hooks
│   ├── useAPI.ts          # API interaction hook
│   ├── useDatabase.ts     # SQLite database hook
│   ├── useDocumentStorage.ts
│   ├── useImagePicker.ts
│   ├── useAudioPlayback.ts
│   └── use-theme-color.ts
├── services/              # API and data services
│   ├── api.ts             # API client and endpoints
│   ├── database.ts        # Database operations
│   └── storage.ts         # File storage operations
├── constants/             # Constants and configuration
│   ├── config.ts          # Backend API configuration
│   ├── theme.ts           # Theme and styling constants
│   └── database-schema.ts # SQLite schema definitions
├── contexts/              # React Context providers
│   └── AccessibilityContext.tsx
└── assets/                # Static assets (images, etc.)
```

## Key Services

### API Service (`services/api.ts`)

Provides methods to interact with the backend:
- Document operations (upload, retrieve, delete)
- Vision analysis requests
- TTS audio generation
- OCR text extraction

### Database Service (`services/database.ts`)

SQLite database for local data persistence:
- Document metadata caching
- Analysis history
- User preferences

### Custom Hooks

- **useAPI**: Manages API calls with loading/error states
- **useDatabase**: SQLite database operations
- **useAudioPlayback**: Audio playback controls
- **useImagePicker**: Image selection from camera/gallery

## Styling & Theme

The app uses a centralized theme system defined in `constants/theme.ts` with support for light and dark modes. Components use `use-theme-color` hook for theme-aware styling.

## Accessibility

Built with accessibility in mind:
- High contrast mode support
- Screen reader optimization
- Adjustable text sizes
- AccessibilityContext for global accessibility settings

## Development

### Code Standards

- TypeScript for type safety
- Component-based architecture
- Custom hooks for business logic separation
- Context API for global state

### Adding New Features

1. Create screens in `app/` directory (uses Expo Router)
2. Create reusable components in `components/`
3. Add custom hooks in `hooks/`
4. Add API methods to `services/api.ts`
5. Update database schema if needed

## Troubleshooting

### Common Issues

- **Port 8081 already in use**: Kill the process or use `expo start --clear`
- **iOS Simulator not starting**: Ensure Xcode command line tools are installed
- **Android build issues**: Clear cache with `npm run reset-project` and reinstall

### Debugging

- Use React DevTools: `npx expo-dev-client`
- Metro bundler debugger available in terminal during `expo start`
- Check logs with `npx expo logs`

## Testing

Testing infrastructure can be configured with Jest and React Native Testing Library.

## Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)
