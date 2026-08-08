# AI Technical Interview Agent

## Overview

AI-powered technical interview platform that conducts structured interviews, evaluates candidate responses, generates adaptive follow-up questions, and produces evidence-based hiring reports.

## Features

* Role-based question banks
* Difficulty levels (Junior, Mid, Senior)
* OpenAI-powered answer evaluation
* Adaptive follow-up generation
* Weighted scoring rubric
* Interview state tracking
* Final assessment reports
* Fallback interview mode
* ElevenLabs-backed voice playback and transcription

## Evaluation Rubric

* Technical Accuracy (30%)
* Problem Solving (25%)
* Communication (15%)
* Edge Cases & Reliability (15%)
* Engineering Quality (15%)

## Tech Stack

### Backend

* FastAPI
* Python
* OpenAI API

### Frontend

* React
* TypeScript
* Vite

## Authentication

The project now uses Supabase for authentication.

To enable it, set these environment variables on the frontend and backend:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* `SUPABASE_JWT_SECRET`

Supabase sign-in and sign-up happen directly from the frontend, while the backend accepts the Supabase JWT as a bearer token for protected interview routes.

## Voice Configuration

The interview app supports two voice modes:

* Browser voice APIs
* ElevenLabs voice through backend-proxied speech synthesis and transcription

To enable ElevenLabs, set these backend environment variables:

* `ELEVENLABS_API_KEY`
* `ELEVENLABS_DEFAULT_VOICE_ID` optional but recommended
* `ELEVENLABS_TTS_MODEL_ID` optional, defaults to `eleven_flash_v2_5`
* `ELEVENLABS_STT_MODEL_ID` optional, defaults to `scribe_v2`
* `ELEVENLABS_OUTPUT_FORMAT` optional, defaults to `mp3_44100_128`
* `ELEVENLABS_TIMEOUT_SECONDS` optional, defaults to `60`

The frontend never sends the ElevenLabs API key directly. Voice playback and transcription requests are proxied through protected backend routes.

## Project Structure

```text
backend/
frontend/
```

## Installation

### Backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
npm install
npm run dev
```

## Usage

1. Select role and level
2. Start interview
3. Answer technical questions
4. Receive an evidence-based evaluation report

## Currently Supported Role

* AI Engineer

## Planned Future Roles

* Frontend Engineer
* Backend Engineer
* Full Stack Engineer
* Data Analyst



## Author

Samin Sadique Aurin

