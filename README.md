# wandr

A chat-based walking route recommendation app that uses natural language input to generate personalized, feasible walking routes. Users describe the walk they want (time available, destination type, preferences), and the app returns routes that prioritize green spaces, scenic paths, and community-recommended locations.

## Features

- 🌳 **Natural Language Input**: Simply describe your walk in plain English
- 🏞️ **Greenery Priority**: Routes automatically prioritize parks and scenic paths
- ⏱️ **Time-Aware**: Intelligently filters routes based on your time constraints
- 🎯 **Smart Recommendations**: Get the top 3 routes that match your needs

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/alex9r/wandr.git
cd wandr
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage Examples

Simply type natural language prompts like:

- "I have 30 minutes for my lunch break"
- "I want a quick 15 minute walk through nature"
- "I have 45 minutes and want a peaceful walk"
- "I need a half hour walk to clear my head"

The app will:
1. Parse your time constraint
2. Filter routes that fit within your available time
3. Recommend the most scenic, green routes available
4. Display route details including duration, distance, and highlights

## How It Works

### NLP Processing

The app uses pattern matching to extract:
- Time constraints (minutes, hours, lunch break)
- User preferences and context

### Route Recommendation

Routes are scored based on:
- **Greenery Score**: Prioritizes parks and natural areas (0-100%)
- **Time Feasibility**: Only shows routes that fit your schedule
- **Scenic Value**: Routes with beautiful views and peaceful settings

### API Endpoints

- `GET /` - Main web interface
- `POST /api/recommend` - Get route recommendations
  - Request: `{ "prompt": "your description" }`
  - Response: Recommended routes with time constraint info
- `GET /api/routes` - Get all available routes

## Project Structure

```
wandr/
├── app.py                 # Flask backend with NLP and routing logic
├── templates/
│   └── index.html        # Web interface
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Development

The current implementation uses mock route data. Future enhancements could include:
- Integration with real mapping APIs (Google Maps, OpenStreetMap)
- GPS location-based route finding
- User preferences and saved routes
- Community-contributed routes and ratings
- Weather-based recommendations
