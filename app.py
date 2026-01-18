from flask import Flask, request, jsonify, render_template
# from flask_cors import CORS
import re
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# CORS(app)

# Configuration
ROUTE_BUFFER_MINUTES = 5  # Buffer time for getting to/from the route
DEFAULT_ROUTE_DISTANCE_KM = 2  # Default route distance if none specified

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


def extract_route_length_from_prompt(prompt: str) -> Optional[float]:
    """
    Extract the desired route length/distance from the user's prompt.
    Uses Claude LLM to understand user intent.
    Returns distance in kilometers, or None if not specified (will use default).
    Falls back to regex patterns if API is not available.
    """
    
    # First, try regex patterns for explicit distance mentions
    distance_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:km|kilometers?|k)', prompt.lower())
    if distance_match:
        return float(distance_match.group(1))
    
    # Try to use Claude API if available
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if api_key:
        try:
            import anthropic
            
            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=100,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Extract the desired walking route distance from this prompt. 
                        Return ONLY a single number representing kilometers, or "DEFAULT" if not specified.
                        Examples: "2 hours" -> 3, "half hour" -> 1, "30 min" -> 1.5, "I want a long walk" -> DEFAULT
                        
                        Prompt: "{prompt}"
                        
                        Response:"""
                    }
                ]
            )
            
            response_text = message.content[0].text.strip()
            if response_text.upper() == "DEFAULT":
                return None
            try:
                return float(response_text)
            except ValueError:
                return None
                
        except Exception as e:
            print(f"Claude API error (falling back to regex): {e}")
            return None
    
    # Fallback: estimate from time constraint
    time_constraint = parse_time_constraint(prompt)
    if time_constraint:
        # Rough estimate: 1 km per 15 minutes of walking
        estimated_distance = time_constraint / 15
        return min(estimated_distance, 15)  # Cap at 15 km
    
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
    firebase_config = {
        "apiKey": os.getenv("FIREBASE_API_KEY"),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.getenv("FIREBASE_PROJECT_ID"),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.getenv("FIREBASE_APP_ID"),
    }
    return render_template('index.html', firebase_config=firebase_config)



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


@app.route('/api/generate-route', methods=['POST'])
def generate_route():
    """
    Generate a circular walking route around user's location.
    Extracts route length from user's prompt.
    Expects JSON with 'latitude', 'longitude', and optional 'prompt' and 'distance_km'.
    If both prompt and distance_km are provided, distance_km takes precedence.
    """
    data = request.get_json()
    
    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({'error': 'Missing latitude or longitude'}), 400
    
    lat = data['latitude']
    lon = data['longitude']
    
    # Determine route distance
    distance_km = None
    
    # Priority 1: explicit distance_km parameter
    if 'distance_km' in data and data['distance_km'] is not None:
        distance_km = data['distance_km']
    # Priority 2: extract from prompt
    elif 'prompt' in data and data['prompt']:
        distance_km = extract_route_length_from_prompt(data['prompt'])
    
    # Priority 3: use default
    if distance_km is None:
        distance_km = DEFAULT_ROUTE_DISTANCE_KM
    
    # Validate distance (cap at 20 km for safety)
    distance_km = min(max(distance_km, 0.5), 20)
    
    try:
        import requests
        import math
        
        # Create a circular route by generating points around the user's location
        # Using OSRM to snap to roads and calculate the actual walking path
        
        # Calculate waypoints for a roughly circular route
        # We'll create 4 waypoints: north, east, south, west
        
        # Approximate distance in degrees (1 degree ≈ 111 km)
        degrees_offset = distance_km / 111 / 2
        
        waypoints = [
            (lat, lon),  # Start at user location
            (lat + degrees_offset, lon),  # North
            (lat, lon + degrees_offset),  # East
            (lat - degrees_offset, lon),  # South
            (lat, lon - degrees_offset),  # West
            (lat, lon)  # Return to start
        ]
        
        # Use OSRM to get the route
        print("Requesting OSRM route...")
        coords_str = ';'.join([f"{lon},{lat}" for lat, lon in waypoints])
        osrm_url = f"http://router.project-osrm.org/route/v1/foot/{coords_str}?overview=full&geometries=geojson"
        print(f"OSRM URL: {osrm_url}")
        response = requests.get(osrm_url, timeout=10)
        
        if response.status_code != 200:
            # Fallback: return simple waypoints if OSRM fails
            route = [{'lat': lat, 'lng': lon} for lat, lon in waypoints]
            return jsonify({'route': route})
        
        osrm_data = response.json()
        
        if 'routes' not in osrm_data or not osrm_data['routes']:
            # Fallback to waypoints
            route = [{'lat': lat, 'lng': lon} for lat, lon in waypoints]
            return jsonify({'route': route})
        
        # Extract coordinates from the OSRM response
        route_geom = osrm_data['routes'][0]['geometry']
        
        # Convert GeoJSON coordinates to our format
        route = [{'lat': coord[1], 'lng': coord[0]} for coord in route_geom['coordinates']]
        
        return jsonify({'route': route})
        
    except Exception as e:
        print(f"Error generating route: {e}")
        # Return a simple fallback route
        import math
        degrees_offset = distance_km / 111 / 2
        waypoints = [
            (lat, lon),
            (lat + degrees_offset, lon),
            (lat, lon + degrees_offset),
            (lat - degrees_offset, lon),
            (lat, lon - degrees_offset),
            (lat, lon)
        ]
        route = [{'lat': lat, 'lng': lon} for lat, lon in waypoints]
        return jsonify({'route': route})


if __name__ == '__main__':
    # WARNING: Debug mode is enabled for development only
    # For production deployment:
    # 1. Set debug=False to prevent arbitrary code execution via debugger
    # 2. Configure host appropriately (not 0.0.0.0)
    # 3. Use a production WSGI server (e.g., gunicorn, uWSGI)
    app.run(debug=True, host='0.0.0.0', port=5000)
