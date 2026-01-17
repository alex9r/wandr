function fillExample(text) {
    document.getElementById('promptInput').value = text;
}

async function getRecommendations() {
    const prompt = document.getElementById('promptInput').value.trim();
    const resultsSection = document.getElementById('resultsSection');
    const submitBtn = document.getElementById('submitBtn');

    if (!prompt) {
        resultsSection.style.display = 'block';
        resultsSection.innerHTML = '<div class="error">⚠️ Please enter a description of the walk you want!</div>';
        return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Finding Routes...';
    resultsSection.style.display = 'block';
    resultsSection.innerHTML = '<div class="loading">🔍 Searching for the perfect routes...</div>';

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
        resultsSection.innerHTML = '<div class="error">❌ Oops! Something went wrong. Please try again.</div>';
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
    
    let html = '<div class="results-header">';
    html += '<h2>🎯 Recommended Routes</h2>';
    if (data.time_constraint_minutes) {
        html += `<p class="constraint-info">⏱️ Filtered for ${escapeHtml(String(data.time_constraint_minutes))} minutes available</p>`;
    }
    html += '</div>';

    if (data.recommendations.length === 0) {
        html += `
            <div class="no-results">
                <div class="no-results-icon">😔</div>
                <h3>No routes found</h3>
                <p>Try adjusting your time constraint or preferences.</p>
            </div>
        `;
    } else {
        data.recommendations.forEach((route, index) => {
            html += `
                <div class="route-card">
                    <div class="route-header">
                        <div class="route-name">${escapeHtml(route.name)}</div>
                        <div class="greenery-badge">🌿 ${escapeHtml(String(route.greenery_score))}% Green</div>
                    </div>
                    <div class="route-meta">
                        <div class="meta-item">
                            <span class="meta-icon">⏱️</span>
                            <span>${escapeHtml(String(route.duration_minutes))} minutes</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-icon">📏</span>
                            <span>${escapeHtml(String(route.distance_km))} km</span>
                        </div>
                    </div>
                    <p class="route-description">${escapeHtml(route.description)}</p>
                    <div class="highlights">
                        ${route.highlights.map(h => `<span class="highlight-tag">✨ ${escapeHtml(h)}</span>`).join('')}
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