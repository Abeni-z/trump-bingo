# Ethiopian Bingo App

React + Vite bingo caller & card management system.

## Setup

```bash
npm install
npm run dev
```

## Features
- **Home**: Register player cards (manual or auto-generated), game settings (language/voice/speed)
- **Game**: Call numbers manually or auto, 75-ball board, voice announcements, winner checker
- **Cards**: View/print all registered cards, bulk generate
- **Report**: Game history, session stats, CSV export

## Winner Check
1. A player calls "Bingo!"
2. Click "Check Winner" in game page
3. Select their registered card OR enter numbers manually
4. System shows the card with called numbers highlighted and winning line in green
5. Confirm win to end game and log result

## Voice
- Uses Web Speech API (built into Chrome/Android)
- Works in English and Amharic (if Amharic TTS installed on device)
