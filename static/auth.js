// Lightweight auth modal + Firebase init with separate Sign In / Sign Up tabs
(function() {
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

        // ---------- Build auth modal ----------
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

                <!-- Sign In -->
                <div id="signinPanel" class="block">
                    <input id="signinEmail" class="w-full p-2 border rounded mb-2" placeholder="Email" />
                    <input id="signinPassword" type="password" class="w-full p-2 border rounded mb-4" placeholder="Password" />
                    <div class="flex gap-2 justify-end">
                        <button id="modalClose" class="px-3 py-1 rounded border">Close</button>
                        <button id="modalSignin" class="px-3 py-1 rounded bg-green-600 text-white">Sign In</button>
                    </div>
                </div>

                <!-- Sign Up -->
                <div id="signupPanel" class="hidden">
                    <input id="signupNickname" class="w-full p-2 border rounded mb-2" placeholder="Nickname (display name)" />
                    <input id="signupEmail" class="w-full p-2 border rounded mb-2" placeholder="Email" />
                    <input id="signupPassword" type="password" class="w-full p-2 border rounded mb-2" placeholder="Password" />
                    <div class="relative mb-4">
                        <input id="signupFavorite" class="w-full p-2 border rounded" placeholder="Favorite location (optional)" />
                        <div id="signupFavoriteAutocomplete" class="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b hidden max-h-48 overflow-y-auto z-50"></div>
                    </div>
                    <div class="flex gap-2 justify-end">
                        <button id="modalClose2" class="px-3 py-1 rounded border">Close</button>
                        <button id="modalSignup" class="px-3 py-1 rounded bg-green-600 text-white">Sign Up</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // ---------- Profile dropdown ----------
        const profileDropdown = document.createElement('div');
        profileDropdown.id = 'profileDropdown';
        profileDropdown.className = 'fixed top-16 right-5 bg-white rounded-lg shadow-lg p-4 hidden w-80 z-40';
        profileDropdown.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold" id="profileUsername">Profile</h3>
                <button id="closeProfileDropdown" class="text-gray-500 hover:text-gray-800 text-xl">&times;</button>
            </div>
            <div class="text-sm text-gray-600 mb-4">
                <p class="font-semibold mb-2">Favorite Location:</p>
                <p id="profileFavorite" class="text-gray-700">Loading...</p>
            </div>
            <button id="signoutBtn" class="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700">Sign Out</button>
        `;
        document.body.appendChild(profileDropdown);

        // ---------- DOM elements ----------
        const signinPanel = document.getElementById('signinPanel');
        const signupPanel = document.getElementById('signupPanel');
        const tabSignin = document.getElementById('tabSignin');
        const tabSignup = document.getElementById('tabSignup');
        const modalClose = document.getElementById('modalClose');
        const modalClose2 = document.getElementById('modalClose2');
        const modalSignup = document.getElementById('modalSignup');
        const modalSignin = document.getElementById('modalSignin');
        const signinBtn = document.getElementById('signinBtn');
        const closeProfileDropdown = document.getElementById('closeProfileDropdown');
        const signoutBtn = document.getElementById('signoutBtn');
        const profileUsername = document.getElementById('profileUsername');
        const profileFavorite = document.getElementById('profileFavorite');
        const signupFavoriteInput = document.getElementById('signupFavorite');
        const signupFavoriteAutocomplete = document.getElementById('signupFavoriteAutocomplete');

        // ---------- Autocomplete for favorite ----------
        async function fetchAddressSuggestions(query) {
            if (query.length < 2) {
                signupFavoriteAutocomplete.classList.add('hidden');
                return;
            }
            try {
                const response = await fetch(
                    'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + 
                    '&viewbox=-79.6383,43.5890,-79.1957,43.8554&bounded=1&limit=5'
                );
                const results = await response.json();
                signupFavoriteAutocomplete.innerHTML = '';
                if (!results.length) {
                    signupFavoriteAutocomplete.classList.add('hidden');
                    return;
                }
                results.forEach(result => {
                    const option = document.createElement('div');
                    option.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm border-b';
                    option.textContent = result.display_name;
                    option.addEventListener('click', () => {
                        signupFavoriteInput.value = result.display_name;
                        signupFavoriteAutocomplete.classList.add('hidden');
                    });
                    signupFavoriteAutocomplete.appendChild(option);
                });
                signupFavoriteAutocomplete.classList.remove('hidden');
            } catch (err) {
                console.error('Autocomplete error:', err);
            }
        }
        signupFavoriteInput.addEventListener('input', e => fetchAddressSuggestions(e.target.value));
        document.addEventListener('click', e => {
            if (e.target !== signupFavoriteInput && !signupFavoriteAutocomplete.contains(e.target)) {
                signupFavoriteAutocomplete.classList.add('hidden');
            }
        });

        // ---------- Tab switching ----------
        tabSignin.addEventListener('click', () => {
            signinPanel.classList.remove('hidden');
            signupPanel.classList.add('hidden');
            tabSignin.classList.add('border-green-600','text-green-600');
            tabSignin.classList.remove('border-transparent','text-gray-600');
            tabSignup.classList.remove('border-green-600','text-green-600');
            tabSignup.classList.add('border-transparent','text-gray-600');
        });
        tabSignup.addEventListener('click', () => {
            signinPanel.classList.add('hidden');
            signupPanel.classList.remove('hidden');
            tabSignup.classList.add('border-green-600','text-green-600');
            tabSignup.classList.remove('border-transparent','text-gray-600');
            tabSignin.classList.remove('border-green-600','text-green-600');
            tabSignin.classList.add('border-transparent','text-gray-600');
        });

        // ---------- Modal close ----------
        const closeModal = () => document.getElementById('authModal').classList.add('hidden');
        modalClose.addEventListener('click', closeModal);
        modalClose2.addEventListener('click', closeModal);
        window.openAuthModal = function() {
            document.getElementById('authModal').classList.remove('hidden');
            signinPanel.classList.remove('hidden');
            signupPanel.classList.add('hidden');
        };

        // ---------- Sign Up ----------
        modalSignup.addEventListener('click', async () => {
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const nickname = document.getElementById('signupNickname').value.trim();
            const favorite = document.getElementById('signupFavorite').value.trim();
            try {
                const u = await auth.createUserWithEmailAndPassword(email, password);
                await u.user.updateProfile({ displayName: nickname });

                // Write user document to Firestore
                const userDocRef = db.collection('users').doc(u.user.uid);
                await userDocRef.set({
                    nickname,
                    email,
                    favoriteLocation: favorite || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert('Signed up successfully');
                document.getElementById('authModal').classList.add('hidden');
            } catch (err) {
                alert('Sign up failed: ' + (err && err.message));
            }
        });

        // ---------- Sign In ----------
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

        // ---------- Load user profile ----------
        async function loadUserProfile(user) {
            profileUsername.textContent = user.displayName || user.email;
            try {
                const snap = await db.collection('users').doc(user.uid).get();
                if (!snap.exists) {
                    profileFavorite.textContent = 'No favorite location saved yet.';
                    currentUserProfile = { email: user.email };
                } else {
                    const data = snap.data();
                    currentUserProfile = data;
                    profileFavorite.textContent = data.favoriteLocation || 'No favorite location saved yet.';
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
                profileFavorite.textContent = 'Error loading favorite location.';
            }
        }

        // ---------- Auth state listener ----------
        auth.onAuthStateChanged(user => {
            if (user) {
                if (signinBtn) signinBtn.classList.add('hidden');

                let btn = document.getElementById('profileBtn');
                if (!btn) {
                    btn = document.createElement('button');
                    btn.id = 'profileBtn';
                    btn.className = 'fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition z-50';
                    btn.textContent = '👤 Profile';
                    btn.addEventListener('click', () => profileDropdown.classList.toggle('hidden'));
                    document.body.appendChild(btn);
                }
                btn.classList.remove('hidden');
                loadUserProfile(user);
            } else {
                if (signinBtn) {
                    signinBtn.classList.remove('hidden');
                    signinBtn.textContent = 'Sign in';
                    signinBtn.onclick = () => window.openAuthModal();
                }
                const profileBtn = document.getElementById('profileBtn');
                if (profileBtn) profileBtn.classList.add('hidden');
                profileDropdown.classList.add('hidden');
                currentUserProfile = null;
            }
        });

        // ---------- Sign out ----------
        signoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            profileDropdown.classList.add('hidden');
        });

    } catch (err) {
        console.error('auth init error', err);
    }
})();
