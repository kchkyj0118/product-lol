# Blueprint: LoL AI Coach

## Overview
LoL AI Coach is a web-based application designed to provide real-time strategic advice for League of Legends players. It uses AI to analyze matchups and suggest optimal playstyles based on current meta data.

## Features implemented
- **Polished PRO COACH UI**: Organized sections for "CHAMPION MATCHUP" and "BATTLE SETTING".
- **Enhanced Context**: Support for detailed matchup inputs (My/Op Champion), Fight Scale (1v1 to 5v5), and Spell selection.
- **Gemini Pro Integration**: Direct connection to the Gemini API for professional-grade coaching reports.
- **Advanced Text Cleaning**: Regex-based cleaning to remove JSON, coordinates, and markdown characters (*, #) for a clean report look.
- **Loading State**: Visual feedback with a loading bar while the AI processes data.
- **Modern Dark Theme**: Optimized layout for readability and professional feel.
- **Privacy & Terms**: Links to legal documentation.

## Technical Details
- **Frontend**: HTML5, CSS3, JavaScript (ES6+).
- **Design**: Gold-themed aesthetics with flexbox and responsive layouts.
- **Data Processing**: Prompt engineering for "Pro Team Head Coach" persona.

## Current Plan
1. [x] Update project structure (Move files to `public/`).
2. [x] Implement the new UI and logic provided by the user.
3. [x] Separate CSS and JavaScript into standalone files for better organization.
4. [ ] Integrate real Firebase/Gemini API for live analysis.
5. [x] Automatically sync changes with GitHub.
