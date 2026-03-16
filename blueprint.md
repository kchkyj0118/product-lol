# Blueprint: LoL AI Coach

## Overview
LoL AI Coach is a web-based application designed to provide real-time strategic advice for League of Legends players. It uses AI to analyze matchups and suggest optimal playstyles based on current meta data.

## Features implemented
- **Lane-Based Analysis**: Structured inputs for TOP, JUNGLE, MID, ADC, and SUPPORT positions.
- **Dynamic UI Generation**: JavaScript-driven UI population for consistent lane rows.
- **Smart Spell Selection**: Automatic "Flash" pre-selection and "Smite" logic for the Jungle position.
- **Side-by-Side Matchup**: Grid layout featuring Blue Team vs. Red Team with clear lane indicators.
- **Professional Analytics**: AI prompt focusing on lane dominance, jungle pathing, teamfight priority, and variable handling.
- **Refined UI/UX**: Gold-themed aesthetics with responsive grids and clear lane labels.
- **Tailwind CSS Integration**: Modern, responsive design using Tailwind CSS.
- **SEO Optimization**: Added `robots.txt`, `sitemap.xml`, and meta tags.
- **Google AdSense Integration**: Added AdSense scripts, placeholders for monetization, and `ads.txt` for verification.

## Technical Details
- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript (ES6+).
- **Backend**: Cloudflare Pages Functions (analyze.js).
- **AI Integration**: Google Gemini 3 Flash Preview API.

## Current Plan
1. [x] Update project structure (Move files to `public/`).
2. [x] Implement the new UI and logic provided by the user.
3. [x] Separate CSS and JavaScript into standalone files for better organization.
4. [x] Integrate real Firebase/Gemini API for live analysis.
5. [x] Automatically sync changes with GitHub.
6. [ ] Add Google AdSense to all pages for monetization.
