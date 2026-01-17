// Lightweight auth modal + Firebase init with separate Sign In / Sign Up tabs
(function() {
    // Only add UI if firebase config exists
    if (!window.FIREBASE_CONFIG) {
        console.info('No Firebase config provided; auth.js will stay inactive.');
        return;
    }

    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded.');
        return;
    }

    try {
        firebase.initializeApp(window.FIREBASE_CONFIG);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Build modal HTML with tabs for Sign In vs Sign Up
        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-96">
                <h3 class="text-xl font-semibold mb-4">Wandr Auth</h3>
                
                <!-- Tabs -->
                <div class="flex gap-2 mb-4 border-b">
                    <button id="tabSignin" class="px-3 py-2 font-semibold border-b-2 border-green-600 text-green-600">Sign In</button>
                    <button id="tabSignup" class="px-3 py-2 font-semibold border-b-2 border-transparent text-gray-600">Sign Up</button>
                </div>

                <!-- Sign In Tab -->
                <div id="signinPanel" class="block">
                    <input id="signinEmail" class="w-full p-2 border rounded mb-2" placeholder="Email" />
                    <input id="signinPassword" type="password" class="w-full p-2 border rounded mb-4" placeholder="Password" />
                    <div class="flex gap-2 justify-end">
                        <button id="modalClose" class="px-3 py-1 rounded border">Close</button>
                        <button id="modalSignin" class="px-3 py-1 rounded bg-green-600 text-white">Sign In</button>
                    </div>
                </div>

                <!-- Sign Up Tab (hidden by default) -->
                <div id="signupPanel" class="hidden">
                    <input id="signupNickname" class="w-full p-2 border rounded mb-2" placeholder="Nickname (display name)" />
                    <input id="signupEmail" class="w-full p-2 border rounded mb-2" placeholder="Email" />
                    <input id="signupPassword" type="password" class="w-full p-2 border rounded mb-2" placeholder="Password" />
                    <input id="signupFavorite" class="w-full p-2 border rounded mb-4" placeholder="Favorite location (optional)" />
                    <div class="flex gap-2 justify-end">
                        <button id="modalClose2" class="px-3 py-1 rounded border">Close</button>
                        <button id="modalSignup" class="px-3 py-1 rounded bg-green-600 text-white">Sign Up</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const signinPanel = document.getElementById('signinPanel');
        const signupPanel = document.getElementById('signupPanel');
        const tabSignin = document.getElementById('tabSignin');
        const tabSignup = document.getElementById('tabSignup');
        const modalClose = document.getElementById('modalClose');
        const modalClose2 = document.getElementById('modalClose2');
        const modalSignup = document.getElementById('modalSignup');
        const modalSignin = document.getElementById('modalSignin');
        const signinBtn = document.getElementById('signinBtn');

        // Tab switching
        tabSignin.addEventListener('click', () => {
            signinPanel.classList.remove('hidden');
            signupPanel.classList.add('hidden');
            tabSignin.classList.add('border-green-600', 'text-green-600');
            tabSignin.classList.remove('border-transparent', 'text-gray-600');
            tabSignup.classList.remove('border-green-600', 'text-green-600');
            tabSignup.classList.add('border-transparent', 'text-gray-600');
        });

        tabSignup.addEventListener('click', () => {
            signinPanel.classList.add('hidden');
            signupPanel.classList.remove('hidden');
            tabSignup.classList.add('border-green-600', 'text-green-600');
            tabSignup.classList.remove('border-transparent', 'text-gray-600');
            tabSignin.classList.remove('border-green-600', 'text-green-600');
            tabSignin.classList.add('border-transparent', 'text-gray-600');
        });

        // Close handlers
        const closeModal = () => document.getElementById('authModal').classList.add('hidden');
        modalClose.addEventListener('click', closeModal);
        modalClose2.addEventListener('click', closeModal);

        window.openAuthModal = function() {
            document.getElementById('authModal').classList.remove('hidden');
            signinPanel.classList.remove('hidden');
            signupPanel.classList.add('hidden');
        };

        // Sign Up
        modalSignup.addEventListener('click', async () => {
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const nickname = document.getElementById('signupNickname').value.trim();
            const favorite = document.getElementById('signupFavorite').value.trim();
            try {
                const u = await auth.createUserWithEmailAndPassword(email, password);
                await u.user.updateProfile({ displayName: nickname });
                if (favorite) {
                    const coords = await geocodeAddress(favorite);
                    if (coords) {
                        await db.collection('favorites').add({
                            uid: u.user.uid,
                            nickname: nickname,
                            email,
                            address: favorite,
                            location: new firebase.firestore.GeoPoint(coords.lat, coords.lon),
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
                alert('Signed up successfully');
                document.getElementById('authModal').classList.add('hidden');
            } catch (err) {
                alert('Sign up failed: ' + (err && err.message));
            }
        });

        // Sign In
        modalSignin.addEventListener('click', async () => {
            const email = document.getElementById('signinEmail').value.trim();
            const password = document.getElementById('signinPassword').value;
            try {
                await auth.signInWithEmailAndPassword(email, password);
                alert('Signed in');
                document.getElementById('authModal').classList.add('hidden');
            } catch (err) {
                alert('Sign in failed: ' + (err && err.message));
            }
        });

        // Auth state listener: update button text and show user info
        auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                signinBtn.textContent = 'Sign out';
                signinBtn.onclick = async () => {
                    await auth.signOut();
                };
            } else {
                // User is signed out
                signinBtn.textContent = 'Sign in';
                signinBtn.onclick = () => window.openAuthModal();
            }
        });

        async function geocodeAddress(address) {
            try {
                const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address));
                const data = await res.json();
                if (data && data.length) {
                    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
                }
            } catch (e) {
                console.error('geocode error', e);
            }
            return null;
        }

    } catch (err) {
        console.error('auth init error', err);
    }
})();
