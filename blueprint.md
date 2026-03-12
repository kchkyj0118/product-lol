# Blueprint: LoL AI Coach

## Overview
LoL AI Coach is a web-based application designed to provide real-time strategic advice for League of Legends players. It uses AI to analyze matchups and suggest optimal playstyles based on current meta data.

## Features implemented
- **Full Team Analysis (5v5)**: Support for inputting all 10 champions in a match.
- **Advanced UI Grids**: Specialized grid layouts for "MY TEAM" and "ENEMY TEAM" inputs.
- **Main Champion Highlighting**: Clear visual distinction for the user's champion and their direct opponent.
- **Dual Spell Support**: Added selection for both Summoner Spells.
- **Global Coaching Prompt**: Enhanced prompt engineering that considers team composition (initiation, sustain, poke) for professional-grade analysis.
- **Improved Data Cleaning**: Regex-based removal of code structures and markdown symbols for professional reports.
- **Loading State**: Visual feedback during deep team analysis.

## Technical Details
- **Frontend**: HTML5, CSS3 (Grid/Flexbox), JavaScript (ES6+).
- **AI Integration**: Gemini Pro API with a "Pro Team Head Analyst" persona.

## Current Plan
1. [x] Update project structure (Move files to `public/`).
2. [x] Implement the new UI and logic provided by the user.
3. [x] Separate CSS and JavaScript into standalone files for better organization.
4. [ ] Integrate real Firebase/Gemini API for live analysis.
5. [x] Automatically sync changes with GitHub.
