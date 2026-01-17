from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)

# Configuration
ROUTE_BUFFER_MINUTES = 5  # Buffer time for getting to/from the route

# Mock data: Walking routes with parks and green spaces
ROUTES = [
    {
        "id": 1,
        "name": "Central Park Loop",
        "duration_minutes": 15,
        "distance_km": 1.2,
        "description": "A scenic loop through Central Park with beautiful tree-lined paths",
        "highlights": ["Oak Grove", "Rose Garden", "Lake View"],
        "greenery_score": 95
    },
    {
        "id": 2,
        "name": "Riverside Garden Walk",
        "duration_minutes": 25,
        "distance_km": 2.0,
        "description": "Peaceful walk along the riverside with lush gardens and wildlife",
        "highlights": ["Riverside Path", "Botanical Garden", "Bird Sanctuary"],
        "greenery_score": 90
    },
    {
        "id": 3,
        "name": "Forest Trail Circuit",
        "duration_minutes": 35,
        "distance_km": 2.8,
        "description": "Immersive forest experience with shaded trails and natural scenery",
        "highlights": ["Pine Forest", "Woodland Path", "Nature Reserve"],
        "greenery_score": 98
    },
    {
        "id": 4,
        "name": "City Park Express",
        "duration_minutes": 10,
        "distance_km": 0.8,
        "description": "Quick refreshing walk through the neighborhood park",
        "highlights": ["Community Garden", "Playground Area", "Fountain Square"],
        "greenery_score": 80
    },
    {
        "id": 5,
        "name": "Meadow and Lake Path",
        "duration_minutes": 45,
        "distance_km": 3.5,
        "description": "Extended walk through open meadows and around a scenic lake",
        "highlights": ["Wildflower Meadow", "Lake Circuit", "Picnic Grove"],
        "greenery_score": 92
    },
    {
        "id": 6,
        "name": "Urban Green Connector",
        "duration_minutes": 20,
        "distance_km": 1.5,
        "description": "Connect multiple small parks and green spaces across the city",
        "highlights": ["Pocket Parks", "Tree-lined Streets", "Community Gardens"],
        "greenery_score": 75
    }
]


def parse_time_constraint(prompt):
    """
    Extract time constraint from user prompt using NLP pattern matching.
    Returns time in minutes, or None if not found.
    """
    prompt_lower = prompt.lower()
    
    # Pattern for "X minutes"
    minutes_match = re.search(r'(\d+)\s*(?:minutes?|mins?)', prompt_lower)
    if minutes_match:
        minutes = int(minutes_match.group(1))
        # Cap at 24 hours (1440 minutes) for sanity
        return min(minutes, 1440)
    
    # Pattern for "X hours"
    hours_match = re.search(r'(\d+)\s*(?:hours?|hrs?)', prompt_lower)
    if hours_match:
        hours = int(hours_match.group(1))
        # Cap at 24 hours for sanity
        return min(hours * 60, 1440)
    
    # Pattern for "half an hour", "half hour"
    if re.search(r'half\s*(?:an\s*)?hour', prompt_lower):
        return 30
    
    # Pattern for "quarter hour"
    if re.search(r'quarter\s*hour', prompt_lower):
        return 15
    
    # Pattern for lunch break (assume 30 minutes if not specified)
    if re.search(r'lunch\s*break', prompt_lower):
        return 30
    
    return None


def recommend_routes(prompt, max_results=3):
    """
    Recommend walking routes based on user prompt.
    Prioritizes greenery and filters by time constraint.
    """
    time_constraint = parse_time_constraint(prompt)
    
    # Filter routes by time constraint if specified
    if time_constraint:
        # Add buffer for getting to/from the route (only if time allows)
        max_duration = max(0, time_constraint - ROUTE_BUFFER_MINUTES)
        available_routes = [r for r in ROUTES if r['duration_minutes'] <= max_duration]
    else:
        available_routes = ROUTES
    
    # Sort by greenery score (prioritize beautiful scenery)
    sorted_routes = sorted(available_routes, key=lambda x: x['greenery_score'], reverse=True)
    
    return sorted_routes[:max_results]


@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')


@app.route('/api/recommend', methods=['POST'])
def get_recommendations():
    """
    API endpoint to get walking route recommendations.
    Expects JSON with 'prompt' field.
    """
    data = request.get_json()
    
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Missing prompt in request'}), 400
    
    prompt = data['prompt']
    
    if not prompt or not prompt.strip():
        return jsonify({'error': 'Prompt cannot be empty'}), 400
    
    # Get route recommendations
    recommendations = recommend_routes(prompt)
    
    # Extract time constraint for response
    time_constraint = parse_time_constraint(prompt)
    
    response = {
        'prompt': prompt,
        'time_constraint_minutes': time_constraint,
        'recommendations': recommendations,
        'count': len(recommendations)
    }
    
    return jsonify(response)


@app.route('/api/routes', methods=['GET'])
def get_all_routes():
    """Get all available routes."""
    return jsonify({'routes': ROUTES})


if __name__ == '__main__':
    # NOTE: For production, set debug=False and configure host appropriately
    # Debug mode is enabled here for development purposes only
    app.run(debug=True, host='0.0.0.0', port=5000)
