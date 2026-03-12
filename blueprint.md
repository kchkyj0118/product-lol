# Blueprint: LoL AI Coach

## Overview
LoL AI Coach is a web-based application designed to provide real-time strategic advice for League of Legends players. It uses AI to analyze matchups and suggest optimal playstyles based on current meta data.

## Features implemented
- **Position Selection**: Users can select their role (Top, Jungle, Mid, ADC, Support).
- **Matchup Input**: Users can input their champion vs. the enemy champion.
- **AI Analysis**: Simulates a strategic analysis of the matchup.
- **Data Cleaning**: JavaScript logic to strip JSON objects, arrays, and coordinate data from AI responses for a cleaner user experience.
- **Modern UI**: Dark-themed, responsive design with gold accents and polished card components.
- **FAQ Section**: Information for users about potential issues and tier support.
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
