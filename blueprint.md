# Blueprint: LoL AI Coach

## Overview
LoL AI Coach is a web-based application designed to provide real-time strategic advice for League of Legends players. It uses AI to analyze matchups and suggest optimal playstyles based on current meta data.

## Features implemented
- **Position Selection**: Users can select their role (Top, Jungle, Mid, ADC, Support).
- **Pro Matchup Input**: Enhanced inputs for "My Champion" and "Opponent Champion".
- **Advanced Context**: Added "My Spell" and "Fight Scale" selection for more precise coaching.
- **Gemini Pro Integration**: Direct integration with the Gemini API using a detailed coaching prompt.
- **AI Analysis**: Simulates a strategic analysis of the matchup with a professional coaching tone.
- **Data Cleaning**: Improved JavaScript logic to ensure only clean text is displayed.
- **Modern UI**: Dark-themed "PRO COACH" interface with flexible layouts.
- **FAQ Section**: Updated info for API connectivity and tier support.
- **Privacy & Terms**: Links to legal documentation.

## Technical Details
- **Frontend**: HTML5, CSS3, JavaScript (ES6+).
- **Design**: Gold-themed aesthetics with container queries and responsive layouts.
- **Data Processing**: Regex-based cleaning of AI output.

## Current Plan
1. [x] Update project structure (Move files to `public/`).
2. [x] Implement the new UI and logic provided by the user.
3. [x] Separate CSS and JavaScript into standalone files for better organization.
4. [ ] Integrate real Firebase/Gemini API for live analysis.
5. [x] Automatically sync changes with GitHub.
