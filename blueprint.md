# Blueprint: LoL AI Coach

## Overview
LoL AI Coach is a web-based application designed to provide real-time strategic advice for League of Legends players. It uses AI to analyze matchups and suggest optimal playstyles based on current meta data.

## Features implemented
- **Side-by-Side Matchup Layout**: Horizontal layout with Blue Team (left), Red Team (right), and a "VS" center zone.
- **Side Identification**: Visual cues using Blue and Red side colors for intuitive team recognition.
- **5v5 Composition Support**: Full input support for all 10 champions with specific side-based panels.
- **Refined Coaching Prompt**: Head Coach persona focusing on team contribution, target priority, and specific win strategies.
- **Improved UI/UX**: Enhanced shadowing, panel borders, and polished input styles for a premium feel.
- **Text Formatting**: Advanced regex cleaning to ensure professional, readable reports.

## Technical Details
- **Frontend**: HTML5, CSS3 (Flexbox), JavaScript (ES6+).
- **AI Integration**: Gemini Pro API with a "Head Coach" persona.

## Current Plan
1. [x] Update project structure (Move files to `public/`).
2. [x] Implement the new UI and logic provided by the user.
3. [x] Separate CSS and JavaScript into standalone files for better organization.
4. [ ] Integrate real Firebase/Gemini API for live analysis.
5. [x] Automatically sync changes with GitHub.
