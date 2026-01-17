function fillExample(text) {
    document.getElementById('promptInput').value = text;
}

async function getRecommendations() {
    const prompt = document.getElementById('promptInput').value.trim();
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

// Allow Enter key to submit
document.getElementById('promptInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        getRecommendations();
    }
});

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
        const map = L.map('map', { center: fallbackCenter, zoom: fallbackZoom });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        }).addTo(map);

        // Force a size invalidation shortly after render (useful if container was hidden or resized)
        setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* ignore */ } }, 200);

        // Try to center on the user's location, with graceful fallback
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                console.log('Map: geolocation success', lat, lon);
                map.setView([lat, lon], 14);
                L.marker([lat, lon]).addTo(map).bindPopup('You are here').openPopup();
                setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 200);
            }, err => {
                console.warn('Map: geolocation failed or denied, using fallback. Error:', err && err.message);
                map.setView(fallbackCenter, fallbackZoom);
            }, { timeout: 5000 });
        } else {
            console.warn('Map: geolocation not supported, using fallback center.');
            map.setView(fallbackCenter, fallbackZoom);
        }

    } catch (err) {
        console.error('Map initialization error:', err);
    }
})();

