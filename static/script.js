// ---------- Firebase Initialization ----------
if (!window.FIREBASE_CONFIG) {
    console.error("Firebase config missing");
} else {
    firebase.initializeApp(window.FIREBASE_CONFIG);
}

const auth = firebase.auth();
const db = firebase.firestore();

let currentUserProfile = null;

function fillExample(text) {
    document.getElementById('promptInput').value = text;
}

async function getRecommendations() {
    let prompt = document.getElementById('promptInput').value.trim();

    if (currentUserProfile?.favoriteLocation) {
        prompt += ` Please consider passing near ${currentUserProfile.favoriteLocation}.`;
    }

    const resultsSection = document.getElementById('resultsSection');
    const submitBtn = document.getElementById('submitBtn');

    if (!prompt) {
        resultsSection.classList.remove('hidden');
        resultsSection.innerHTML = '<div class="bg-red-500 text-white p-4 rounded-lg mb-5">⚠️ Please enter a description of the walk you want!</div>';
        return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Finding Routes...';
    resultsSection.classList.remove('hidden');
    resultsSection.innerHTML = '<div class="text-center p-10 text-white text-lg">🔍 Searching for the perfect routes...</div>';

    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            throw new Error('Failed to get recommendations');
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        resultsSection.innerHTML = '<div class="bg-red-500 text-white p-4 rounded-lg mb-5">❌ Oops! Something went wrong. Please try again.</div>';
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Find My Walk';
    }
}

function displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    
    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    let html = '<div class="bg-white rounded-2xl p-8 shadow-lg mb-5">';
    html += '<h2 class="text-2xl font-semibold text-gray-800 mb-3">🎯 Recommended Routes</h2>';
    if (data.time_constraint_minutes) {
        html += `<p class="text-lg font-semibold text-purple-500">⏱️ Filtered for ${escapeHtml(String(data.time_constraint_minutes))} minutes available</p>`;
    }
    html += '</div>';

    if (data.recommendations.length === 0) {
        html += `
            <div class="bg-white rounded-2xl p-10 text-center shadow-lg">
                <div class="text-5xl mb-5">😔</div>
                <h3 class="text-gray-800 mb-2 font-semibold">No routes found</h3>
                <p class="text-gray-600">Try adjusting your time constraint or preferences.</p>
            </div>
        `;
    } else {
        data.recommendations.forEach((route, index) => {
            html += `
                <div class="bg-white rounded-2xl p-6 shadow-lg mb-5 transition hover:-translate-y-1 hover:shadow-xl">
                    <div class="flex justify-between items-start mb-4">
                        <div class="text-2xl font-semibold text-gray-800">${escapeHtml(route.name)}</div>
                        <div class="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">🌿 ${escapeHtml(String(route.greenery_score))}% Green</div>
                    </div>
                    <div class="flex gap-5 mb-4 text-gray-600">
                        <div class="flex items-center gap-1">
                            <span class="text-lg">⏱️</span>
                            <span>${escapeHtml(String(route.duration_minutes))} minutes</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-lg">📏</span>
                            <span>${escapeHtml(String(route.distance_km))} km</span>
                        </div>
                    </div>
                    <p class="text-gray-700 leading-relaxed mb-4">${escapeHtml(route.description)}</p>
                    <div class="flex flex-wrap gap-2">
                        ${route.highlights.map(h => `<span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">✨ ${escapeHtml(h)}</span>`).join('')}
                    </div>
                </div>
            `;
        });
    }

    resultsSection.innerHTML = html;
}

// Global map and route layer variables
let globalMap = null;
let globalUserLocation = null;
let routePolyline = null;
let routeLayer = null;

// Generate a circular walking route
async function generateRoute() {
    if (!globalUserLocation) {
        alert('📍 Waiting for your location... please try again in a moment.');
        return;
    }

    const btn = document.getElementById('generateRouteBtn');
    btn.disabled = true;
    btn.textContent = '🔄 Generating Route...';

    try {
        // Generate a circular route (roughly 1-2 km) around the user's location
        const response = await fetch('/api/generate-route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                latitude: globalUserLocation.lat,
                longitude: globalUserLocation.lng,
                distance_km: 2 // 2 km route
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate route');
        }

        const data = await response.json();
        displayRouteOnMap(data.route);
    } catch (error) {
        alert('❌ Failed to generate route. Please try again.');
        console.error('Route generation error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = '🗺️ Generate Route';
    }
}

// Display route on the map
function displayRouteOnMap(routeCoordinates) {
    if (!globalMap) return;

    // Remove existing route if any
    if (routePolyline) {
        globalMap.removeLayer(routePolyline);
    }
    if (routeLayer) {
        globalMap.removeLayer(routeLayer);
    }

    // Convert route coordinates to Leaflet format
    const latlngs = routeCoordinates.map(coord => [coord.lat, coord.lng]);

    // Create polyline for the route
    routePolyline = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 10'
    }).addTo(globalMap);

    // Create feature group for route elements
    routeLayer = L.featureGroup().addTo(globalMap);

    // Add start marker (user location)
    L.circleMarker(latlngs[0], {
        radius: 8,
        fillColor: '#10b981',
        color: '#059669',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(routeLayer).bindPopup('Start/End Point');

    // Fit map to route bounds
    const bounds = L.latLngBounds(latlngs);
    globalMap.fitBounds(bounds, { padding: [50, 50] });

    console.log('Route displayed with', latlngs.length, 'points');
}

// ---------- Leaflet map initialization (defensive) ----------
(function initMap() {
    // Only run if there's a map container on the page
    const mapEl = document.getElementById('map');
    if (!mapEl) {
        console.info('No #map element found — skipping map initialization.');
        return;
    }

    // Wait for Leaflet to be available
    if (typeof window.L === 'undefined') {
        console.error('Leaflet (L) is not available. Make sure leaflet.js is loaded before script.js');
        return;
    }

    try {
        const fallbackCenter = [40.7128, -74.0060]; // NYC
        const fallbackZoom = 12;

        // Initialize map with a default center so tiles start loading immediately
        globalMap = L.map('map', { center: fallbackCenter, zoom: fallbackZoom });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        }).addTo(globalMap);

        // Force a size invalidation shortly after render (useful if container was hidden or resized)
        setTimeout(() => { try { globalMap.invalidateSize(); } catch (e) { /* ignore */ } }, 200);

        // Try to center on the user's location, with graceful fallback
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                console.log('Map: geolocation success', lat, lon);
                globalUserLocation = { lat, lng: lon };
                globalMap.setView([lat, lon], 14);
                L.marker([lat, lon]).addTo(globalMap).bindPopup('📍 You are here').openPopup();
                setTimeout(() => { try { globalMap.invalidateSize(); } catch (e) {} }, 200);
            }, err => {
                console.warn('Map: geolocation failed or denied, using fallback. Error:', err && err.message);
                globalMap.setView(fallbackCenter, fallbackZoom);
            }, { timeout: 5000 });
        } else {
            console.warn('Map: geolocation not supported, using fallback center.');
            globalMap.setView(fallbackCenter, fallbackZoom);
        }

    } catch (err) {
        console.error('Map initialization error:', err);
    }
})();


// ---------- Firebase auth state ----------
auth.onAuthStateChanged(async (user) => {
    const statusEl = document.getElementById('authStatus');

    if (!user) {
        currentUserProfile = null;
        if (statusEl) statusEl.textContent = 'Not signed in';
        return;
    }

    try {
        const snap = await db.collection('users').doc(user.uid).get();
        currentUserProfile = snap.data();

        if (statusEl && currentUserProfile?.nickname) {
            statusEl.textContent = `Signed in as ${currentUserProfile.nickname}`;
        }
    } catch (err) {
        console.error('Failed to load user profile', err);
    }
});

async function signUp() {
    const nickname = document.getElementById('nicknameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const favoriteLocation = document.getElementById('favoriteLocationInput').value.trim();

    if (!nickname || !email || !password) {
        alert('Please fill all required fields.');
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);

        await db.collection('users').doc(cred.user.uid).set({
            nickname,
            email,
            favoriteLocation,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        alert(err.message);
    }
}

async function signIn() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        alert(err.message);
    }
}
