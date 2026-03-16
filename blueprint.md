# Blueprint: LoL AI Coach

## Overview
LoL AI Coach is a web-based application designed to provide real-time strategic advice for League of Legends players. It uses AI to analyze matchups and suggest optimal playstyles based on current meta data.

## Features implemented
- **Lane-Based Analysis**: Structured inputs for TOP, JUNGLE, MID, ADC, and SUPPORT positions.
- **Dynamic UI Generation**: JavaScript-driven UI population for consistent lane rows.
- **Smart Spell Selection**: Automatic "Flash" pre-selection and "Smite" logic for the Jungle position.
- **Side-by-Side Matchup**: Grid layout featuring Blue Team vs. Red Team with clear lane indicators.
- **Refined AI Analytics**: AI prompt now focuses on 3rd-level timing, ganking probability for each lane, and identifying win-condition champions to prioritize.
- **Strategic Summarization**: Concise 3-line formula for victory with toggleable detailed strategic advice.
- **Refined UI/UX**: Gold-themed aesthetics with responsive grids, lane labels, and clear team separation.
- **Tailwind CSS Integration**: Modern, responsive design using Tailwind CSS.
- **SEO & Monetization**: Optimized for SEO with meta tags, robots.txt, and sitemap.xml. Integrated Google AdSense with ads.txt verification.

## Technical Details
- **Frontend**: HTML5, CSS3 (Tailwind), JavaScript (ES6+).
- **Backend**: Cloudflare Pages Functions (analyze.js).
- **AI Integration**: Google Gemini 1.5 Flash API (via Cloudflare Functions).

## Current Plan
1. [x] Update project structure (Move files to `public/`).
2. [x] Implement the new UI and logic provided by the user.
3. [x] Separate CSS and JavaScript into standalone files for better organization.
4. [x] Integrate real Firebase/Gemini API for live analysis.
5. [x] Automatically sync changes with GitHub.
6. [x] Refine AI prompt for protagonist-focused analysis (updated to focus on ganking probability and win-conditions).
7. [x] Implement toggleable detailed strategy UI.
8. [ ] Add more champion-specific strategic tips and counter-play advice.
