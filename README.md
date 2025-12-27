# 🎯 Enterprise Action Item Creator

> High-accuracy, bilingual action item extraction with professional import/export capabilities

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)

## ✨ Features

### 🌐 Bilingual Support
- **Hindi Audio Input** → English Action Items
- **English Audio Input** → English Action Items
- Automatic language detection and translation
- Phonetic name translation

### 🎤 High-Accuracy Speech-to-Text
- Optimized Web Speech Recognition API
- Auto-restart for continuous recording
- Real-time transcript display
- Multi-alternative processing for better accuracy

### 📊 Professional Export/Import
- **CSV Export**: Excel-compatible with UTF-8 BOM
- **JSON Export**: Complete backup with metadata
- **JSON Import**: Restore previous sessions
- Secure file validation and sanitization

### 🔒 Enterprise-Grade Security
- XSS prevention through input sanitization
- File size validation (10MB limit)
- Request timeout protection
- Memory leak prevention
- Proper error handling

### 📋 Smart Action Item Extraction
- AI-powered extraction using Claude Sonnet 4
- Structured 6-column format:
  - Serial Number
  - Action Name (What)
  - Action By (Whom)
  - Due Date (When)
  - Process (How - step-by-step)
  - Remarks
- Edit before freezing
- Freeze to lock items (read-only)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser (Chrome/Edge recommended for speech recognition)
- Microphone access

### Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/action-item-creator.git
cd action-item-creator

# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 📖 Usage Guide

### Step 1: Select Language
Choose between:
- 🇮🇳 हिंदी (Hindi) - for Hindi audio input
- 🇺🇸 English - for English audio input

### Step 2: Record or Type
- Click **"Start Recording"** to record audio
- Or manually type/paste your transcript
- Speak clearly about tasks, assignments, and deadlines

### Step 3: Generate Action Items
- Click **"Generate Action Items"**
- AI analyzes transcript and extracts structured action items
- All items displayed in English

### Step 4: Review & Edit
- Edit any field before freezing
- Add/modify details as needed
- Delete unwanted items

### Step 5: Export & Freeze
- **Export CSV**: For use in Excel, Google Sheets
- **Export JSON**: Complete backup for later import
- **Freeze**: Lock items to prevent further edits

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: Claude Sonnet 4 (Anthropic API)
- **Speech Recognition**: Web Speech API

## 🏗️ Architecture
