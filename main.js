// ============================================
// GigFlow - Frontend API Integration Layer
// ============================================
// Connects to Spring Boot backend (port 8080)
// Falls back to localStorage when backend is down
// ============================================

const API_BASE = 'http://localhost:8080/api';

// ============================================
// API Module - Wraps fetch() with JWT
// ============================================
const API = {
    async request(endpoint, options = {}) {
        const session = JSON.parse(localStorage.getItem('gf_session'));
        const headers = { 'Content-Type': 'application/json' };
        if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            if (!res.ok) {
                const err = await res.text();
                throw new Error(err || `HTTP ${res.status}`);
            }
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        } catch (e) {
            console.warn(`API call failed: ${endpoint}`, e.message);
            throw e;
        }
    },

    // --- Auth ---
    async register(name, email, password, role) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role: role.toUpperCase() })
        });
    },

    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    // --- Client ---
    async postJob(title, description, budget) {
        return this.request('/client/jobs', {
            method: 'POST',
            body: JSON.stringify({ title, description, budget: Number(budget) })
        });
    },

    async getMyJobs() {
        return this.request('/client/my-jobs');
    },

    async getJobBids(jobId) {
        return this.request(`/client/jobs/${jobId}/bids`);
    },

    async acceptBid(bidId) {
        return this.request(`/client/bids/${bidId}/accept`, { method: 'PUT' });
    },

    // --- Freelancer ---
    async browseJobs() {
        return this.request('/freelancer/jobs');
    },

    async placeBid(jobId, amount, proposal) {
        return this.request('/freelancer/bids', {
            method: 'POST',
            body: JSON.stringify({ jobId, amount: Number(amount), proposal })
        });
    },

    async getMyBids() {
        return this.request('/freelancer/my-bids');
    },

    async markJobCompleted(jobId) {
        return this.request(`/freelancer/jobs/${jobId}/complete`, { method: 'PUT' });
    }
};

// ============================================
// Offline Fallback - GigDB (localStorage)
// ============================================
const GigDB = {
    _get(key) { return JSON.parse(localStorage.getItem(key)) || []; },
    _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    getUsers() { return this._get('gf_users'); },
    addUser(user) {
        const users = this.getUsers();
        user.id = Date.now();
        user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
        users.push(user);
        this._set('gf_users', users);
        return user;
    },
    findUser(email) { return this.getUsers().find(u => u.email === email); },
    getJobs() { return this._get('gf_jobs'); },
    addJob(job) {
        const jobs = this.getJobs();
        job.id = Date.now(); job.status = 'OPEN'; job.createdAt = new Date().toISOString();
        jobs.push(job); this._set('gf_jobs', jobs); return job;
    },
    updateJob(id, updates) {
        const jobs = this.getJobs().map(j => j.id === id ? { ...j, ...updates } : j);
        this._set('gf_jobs', jobs);
    },
    getJobsByClient(email) { return this.getJobs().filter(j => j.clientEmail === email); },
    getOpenJobs() { return this.getJobs().filter(j => j.status === 'OPEN'); },
    getJobsForFreelancer(email) { return this.getJobs().filter(j => j.assignedTo === email); },
    getBids() { return this._get('gf_bids'); },
    addBid(bid) {
        const bids = this.getBids();
        bid.id = Date.now(); bid.status = 'PENDING'; bids.push(bid);
        this._set('gf_bids', bids); return bid;
    },
    getBidsForJob(jobId) { return this.getBids().filter(b => b.jobId === jobId); },
    getBidsByFreelancer(email) { return this.getBids().filter(b => b.freelancerEmail === email); },
    seed() {
        if (localStorage.getItem('gf_seeded')) return;
        this.addUser({ name: 'Alex Client', email: 'alex@techcorp.com', password: '123456', role: 'CLIENT' });
        this.addUser({ name: 'Sarah Dev', email: 'sarah@dev.com', password: '123456', role: 'FREELANCER' });
        const j1 = this.addJob({ title: 'E-commerce Website Redesign', description: 'Convert Shopify store to custom React frontend.', budget: 150000, deadline: '2026-04-01', clientEmail: 'alex@techcorp.com', clientName: 'Alex Client' });
        this.addBid({ jobId: j1.id, jobTitle: j1.title, freelancerEmail: 'sarah@dev.com', freelancerName: 'Sarah Dev', amount: 140000, proposal: 'I can finish this in 4 days. Expert in React & Shopify.' });
        localStorage.setItem('gf_seeded', 'true');
    }
};
GigDB.seed();

// Track if backend is available
let backendAvailable = true;
async function checkBackend() {
    try {
        await fetch(`${API_BASE}/auth/login`, { method: 'OPTIONS' });
        backendAvailable = true;
    } catch {
        backendAvailable = false;
        console.warn('Backend not available. Using localStorage fallback.');
    }
}
checkBackend();

// ============================================
// Session Helpers
// ============================================
function getSession() { return JSON.parse(localStorage.getItem('gf_session')); }
function setSession(data) { localStorage.setItem('gf_session', JSON.stringify(data)); }
function clearSession() { localStorage.removeItem('gf_session'); }

// ============================================
// Auth Logic
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const user = getSession();

    // --- Hero Image ---
    const heroImg = document.getElementById('hero-dynamic-img');
    if (heroImg) heroImg.src = 'hero_image.png';

    // --- Auth Form ---
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        const signupFields = document.getElementById('signup-fields');
        const toggleBtn = document.getElementById('auth-toggle');
        let isSignup = false;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isSignup = !isSignup;
                signupFields.style.display = isSignup ? 'block' : 'none';
                document.getElementById('auth-submit-btn').innerText = isSignup ? 'Create Account' : 'Start Working';
                toggleBtn.innerText = isSignup ? 'Login' : 'Sign up';
                document.getElementById('auth-toggle-text').innerText = isSignup ? 'Already have an account?' : "Don't have an account?";
            });
        }

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const role = document.querySelector('input[name="role"]:checked').value;
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const submitBtn = document.getElementById('auth-submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Please wait...';

            try {
                if (isSignup) {
                    const name = document.getElementById('auth-name').value;
                    if (!name) { showToast('Please enter your name!', 'error'); submitBtn.disabled = false; submitBtn.innerText = 'Create Account'; return; }

                    try {
                        await API.register(name, email, password, role);
                    } catch {
                        // Fallback: save to localStorage
                        if (GigDB.findUser(email)) { showToast('Account already exists!', 'error'); submitBtn.disabled = false; submitBtn.innerText = 'Create Account'; return; }
                        GigDB.addUser({ name, email, password, role: role.toUpperCase() });
                    }

                    // Now login
                    try {
                        const resp = await API.login(email, password);
                        setSession({ token: resp.token, id: resp.id, name: resp.name, email: resp.email, role: resp.role.toLowerCase(), avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${resp.email}` });
                    } catch {
                        setSession({ name, email, role, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` });
                    }
                } else {
                    try {
                        const resp = await API.login(email, password);
                        const userRole = (typeof resp.role === 'string' ? resp.role : resp.role).toString().toLowerCase();
                        if (userRole !== role) { showToast(`This account is registered as ${userRole}. Select the correct role.`, 'error'); submitBtn.disabled = false; submitBtn.innerText = 'Start Working'; return; }
                        setSession({ token: resp.token, id: resp.id, name: resp.name, email: resp.email, role: userRole, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${resp.email}` });
                    } catch (err) {
                        // Fallback to localStorage
                        const found = GigDB.findUser(email);
                        if (!found || found.password !== password) { showToast('Invalid email or password!', 'error'); submitBtn.disabled = false; submitBtn.innerText = 'Start Working'; return; }
                        const localRole = (found.role || '').toLowerCase();
                        if (localRole !== role) { showToast(`This account is ${localRole}. Select the correct role.`, 'error'); submitBtn.disabled = false; submitBtn.innerText = 'Start Working'; return; }
                        setSession({ name: found.name, email: found.email, role, avatar: found.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` });
                    }
                }
                window.location.href = role === 'client' ? 'dash-client.html' : 'dash-freelancer.html';
            } catch (err) {
                showToast(err.message || 'Authentication failed!', 'error');
                submitBtn.disabled = false;
                submitBtn.innerText = isSignup ? 'Create Account' : 'Start Working';
            }
        });
    }

    // --- Logout ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => { clearSession(); window.location.href = 'index.html'; });
    }

    // --- Guard dashboards ---
    if (window.location.pathname.includes('dash-') && !user) {
        window.location.href = 'auth.html'; return;
    }

    // --- Populate Navbar ---
    if (user) {
        const navName = document.getElementById('nav-username');
        const navAvatar = document.getElementById('nav-avatar');
        if (navName) navName.innerText = user.name;
        if (navAvatar) navAvatar.src = user.avatar;
    }

    // --- Sidebar Navigation ---
    window.switchView = (viewId) => {
        document.querySelectorAll('.dashboard-view').forEach(v => v.style.display = 'none');
        const target = document.getElementById(viewId);
        if (target) target.style.display = 'block';
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('onclick')?.includes(viewId));
        });
        if (viewId === 'view-projects') renderClientProjects();
        if (viewId === 'view-explore') renderFreelancerJobs();
        if (viewId === 'view-taken') renderFreelancerTaken();
        if (viewId === 'view-history') renderHistory();
        if (viewId === 'view-wallet') renderWallet();
        if (viewId === 'view-profile') renderProfile();
    };

    // --- Init dashboard ---
    if (window.location.pathname.includes('dash-client.html') && user) renderClientProjects();
    if (window.location.pathname.includes('dash-freelancer.html') && user) renderFreelancerJobs();
});

// ============================================
// UI Helpers
// ============================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'glass animate-fade';
    toast.style.cssText = `position:fixed;bottom:2rem;right:2rem;padding:1rem 2rem;border-radius:12px;z-index:2000;background:${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};color:white;font-weight:600;box-shadow:var(--shadow-lg);`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatCurrency(amount) { return '₹' + Number(amount).toLocaleString('en-IN'); }

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function statusLabel(status) {
    const map = {
        'OPEN': { label: 'OPEN FOR BIDS', color: 'var(--success)' },
        'HIRED': { label: 'ASSIGNED', color: 'var(--secondary)' },
        'IN_PROGRESS': { label: 'IN PROGRESS', color: 'var(--secondary)' },
        'COMPLETED': { label: 'COMPLETED', color: 'var(--primary)' },
        'SUBMITTED': { label: 'WORK SUBMITTED', color: 'var(--warning)' }
    };
    return map[status] || map['OPEN'];
}

// ============================================
// CLIENT DASHBOARD
// ============================================
async function renderClientProjects() {
    const user = getSession();
    if (!user) return;
    const container = document.getElementById('projects-list');
    const bidsPanel = document.getElementById('quick-bids');
    if (!container) return;

    let jobs = [];
    try {
        jobs = await API.getMyJobs();
    } catch {
        jobs = GigDB.getJobsByClient(user.email);
    }

    if (jobs.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);"><i data-lucide="inbox" style="width:48px;height:48px;margin:0 auto 1rem;"></i><p>No projects yet. Post your first job!</p></div>`;
        if (bidsPanel) bidsPanel.innerHTML = '';
        lucide.createIcons(); return;
    }

    container.innerHTML = jobs.map(job => {
        const st = statusLabel(job.status);
        let bidsCount = '';
        let actions = '';

        if (job.status === 'OPEN') {
            actions = `<button class="btn btn-primary" style="font-size:0.8rem;padding:0.5rem 1rem;" onclick="renderBidsForJob(${job.id})">Show Bids</button>`;
        } else if (job.status === 'COMPLETED') {
            actions = `<span style="font-size:0.8rem;color:var(--success);font-weight:700;">✓ Completed</span>`;
        } else if (job.status === 'HIRED' || job.status === 'IN_PROGRESS') {
            actions = `<span style="font-size:0.8rem;color:var(--text-muted);">Assigned to ${job.freelancerName || 'freelancer'}</span>`;
        } else if (job.status === 'SUBMITTED') {
            actions = `<button class="btn btn-primary" style="font-size:0.8rem;padding:0.5rem 1rem;" onclick="reviewAndPay(${job.id})">Review & Pay</button>`;
        }

        return `
            <div class="card" style="margin-bottom:1.5rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:1rem;">
                    <div>
                        <span style="background:rgba(16,185,129,0.1);color:${st.color};padding:0.25rem 0.5rem;border-radius:4px;font-size:0.7rem;font-weight:800;">${st.label}</span>
                        <h3 style="margin-top:0.5rem;">${job.title}</h3>
                    </div>
                    <span style="font-weight:800;">${formatCurrency(job.budget)}</span>
                </div>
                <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1rem;">${job.description}</p>
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Posted ${timeAgo(job.createdAt)}</p>
                <div style="display:flex;gap:0.5rem;">${actions}</div>
            </div>`;
    }).join('');
    lucide.createIcons();

    // Show bids for first open job
    const firstOpen = jobs.find(j => j.status === 'OPEN');
    if (firstOpen && bidsPanel) renderBidsForJob(firstOpen.id);
    else if (bidsPanel) bidsPanel.innerHTML = '';
}

async function renderBidsForJob(jobId) {
    const bidsPanel = document.getElementById('quick-bids');
    if (!bidsPanel) return;

    let bids = [];
    try {
        bids = await API.getJobBids(jobId);
    } catch {
        bids = GigDB.getBidsForJob(jobId);
    }

    if (bids.length === 0) {
        bidsPanel.innerHTML = `<h3 style="margin-bottom:1rem;font-size:1rem;">Proposals (0)</h3><p style="color:var(--text-muted);font-size:0.875rem;">No bids received yet.</p>`;
        return;
    }

    bidsPanel.innerHTML = `<h3 style="margin-bottom:1rem;font-size:1rem;">Proposals (${bids.length})</h3>` +
        bids.map(bid => `
            <div class="card glass animate-fade" style="padding:1rem;border-left:4px solid var(--primary);margin-bottom:1rem;">
                <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:0.5rem;">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${bid.freelancerName || bid.freelancerEmail}" style="width:32px;height:32px;border-radius:50%;background:#ddd;">
                    <div>
                        <p style="font-weight:700;font-size:0.85rem;">${bid.freelancerName || 'Freelancer'}</p>
                        <p style="font-size:0.7rem;color:var(--text-muted);">${bid.status || 'PENDING'}</p>
                    </div>
                </div>
                <p style="font-size:0.8rem;margin-bottom:1rem;">"${bid.proposal}"</p>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:800;font-size:0.9rem;">${formatCurrency(bid.amount)}</span>
                    ${bid.status === 'PENDING' ? `<button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.7rem;" onclick="assignFreelancer(${bid.id}, ${jobId})">Assign</button>` : `<span style="color:var(--success);font-weight:700;font-size:0.75rem;">Accepted</span>`}
                </div>
            </div>
        `).join('');
    lucide.createIcons();
}

async function assignFreelancer(bidId, jobId) {
    try {
        await API.acceptBid(bidId);
        showToast('Freelancer assigned successfully!');
    } catch {
        // Fallback
        const bids = GigDB.getBids();
        const bid = bids.find(b => b.id === bidId);
        if (bid) {
            GigDB.updateJob(jobId, { status: 'HIRED', assignedTo: bid.freelancerEmail, freelancerName: bid.freelancerName });
        }
        showToast('Freelancer assigned (offline mode)!');
    }
    renderClientProjects();
}

function reviewAndPay(jobId) {
    const modal = document.getElementById('rate-modal');
    if (modal) { modal.style.display = 'flex'; modal.dataset.jobId = jobId; }
}

async function submitReviewAndPay() {
    const modal = document.getElementById('rate-modal');
    const jobId = Number(modal.dataset.jobId);
    // In a real app this would call a payment API
    GigDB.updateJob(jobId, { status: 'COMPLETED', paid: true });
    modal.style.display = 'none';
    showToast('Payment released!');
    renderClientProjects();
}

// Post Job
async function postNewJob() {
    const title = document.getElementById('job-title').value;
    const desc = document.getElementById('job-desc').value;
    const deadline = document.getElementById('job-deadline').value;
    const budget = document.getElementById('job-budget').value;
    if (!title || !desc || !budget) { showToast('Please fill all fields!', 'error'); return; }

    try {
        await API.postJob(title, desc, budget);
        showToast('Project posted successfully!');
    } catch {
        const user = getSession();
        GigDB.addJob({ title, description: desc, budget: Number(budget), deadline, clientEmail: user.email, clientName: user.name });
        showToast('Project posted (offline mode)!');
    }
    document.getElementById('post-form').reset();
    switchView('view-projects');
}

// ============================================
// FREELANCER DASHBOARD
// ============================================
async function renderFreelancerJobs() {
    const user = getSession();
    if (!user) return;
    const container = document.getElementById('job-feed');
    if (!container) return;

    let jobs = [];
    let myBidJobIds = [];
    try {
        jobs = await API.browseJobs();
        const myBids = await API.getMyBids();
        myBidJobIds = myBids.map(b => b.jobId);
    } catch {
        jobs = GigDB.getOpenJobs();
        myBidJobIds = GigDB.getBidsByFreelancer(user.email).map(b => b.jobId);
    }

    if (jobs.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);"><p>No jobs available right now. Check back later!</p></div>`;
        return;
    }

    container.innerHTML = jobs.map(job => {
        const alreadyBid = myBidJobIds.includes(job.id);
        return `
        <div class="card" style="margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <h3 style="color:var(--primary);">${job.title}</h3>
                    <p style="font-size:0.75rem;color:var(--text-muted);margin:0.5rem 0;">Posted by ${job.clientName || 'Client'} • ${timeAgo(job.createdAt)}</p>
                </div>
                <span style="font-weight:800;">${formatCurrency(job.budget)}</span>
            </div>
            <p style="color:var(--text-muted);font-size:0.875rem;margin:1rem 0;">${job.description}</p>
            <div style="display:flex;justify-content:flex-end;">
                ${alreadyBid
                    ? `<span style="font-size:0.8rem;color:var(--success);font-weight:700;">Bid Placed</span>`
                    : `<button class="btn btn-primary" onclick="openBidModal(${job.id},'${job.title.replace(/'/g, "\\'")}')">Place Bid</button>`
                }
            </div>
        </div>`;
    }).join('');
}

function openBidModal(jobId, jobTitle) {
    const modal = document.getElementById('bid-modal');
    modal.style.display = 'flex'; modal.dataset.jobId = jobId;
    document.getElementById('bid-modal-title').innerText = `Bid on: ${jobTitle}`;
}

async function submitBid() {
    const user = getSession();
    const modal = document.getElementById('bid-modal');
    const jobId = Number(modal.dataset.jobId);
    const amount = document.getElementById('bid-amount').value;
    const proposal = document.getElementById('bid-proposal').value;
    if (!amount || !proposal) { showToast('Please fill all fields!', 'error'); return; }

    try {
        await API.placeBid(jobId, amount, proposal);
        showToast('Bid placed successfully!');
    } catch {
        const job = GigDB.getJobs().find(j => j.id === jobId);
        GigDB.addBid({ jobId, jobTitle: job?.title || '', freelancerEmail: user.email, freelancerName: user.name, amount: Number(amount), proposal });
        showToast('Bid placed (offline mode)!');
    }
    modal.style.display = 'none';
    document.getElementById('bid-form').reset();
    renderFreelancerJobs();
}

async function renderFreelancerTaken() {
    const user = getSession();
    if (!user) return;
    const container = document.getElementById('taken-list');
    if (!container) return;

    let bids = [];
    try {
        bids = await API.getMyBids();
        bids = bids.filter(b => b.status === 'ACCEPTED');
    } catch {
        const jobs = GigDB.getJobsForFreelancer(user.email);
        bids = jobs.map(j => ({ jobId: j.id, jobTitle: j.title, amount: j.budget, status: j.status }));
    }

    if (bids.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);"><p>No assigned projects yet. Place bids to get started!</p></div>`;
        return;
    }

    container.innerHTML = bids.map(bid => {
        const isCompleted = bid.status === 'COMPLETED';
        return `
        <div class="card" style="margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:1.5rem;">
                <div>
                    <h3 style="margin-bottom:0.25rem;">${bid.jobTitle}</h3>
                    <p style="font-size:0.8rem;color:var(--text-muted);">Status: <span style="color:${isCompleted ? 'var(--success)' : 'var(--secondary)'};font-weight:700;">${isCompleted ? 'Completed' : 'In Progress'}</span></p>
                </div>
                <p style="font-weight:800;">${formatCurrency(bid.amount)}</p>
            </div>
            ${!isCompleted ? `
                <div style="background:var(--bg-main);padding:1.5rem;border-radius:var(--radius-md);border:1px dashed var(--border);text-align:center;margin-bottom:1.5rem;">
                    <i data-lucide="upload-cloud" style="width:32px;height:32px;color:var(--text-muted);margin-bottom:0.5rem;"></i>
                    <p style="font-size:0.875rem;color:var(--text-muted);">Upload your project work</p>
                </div>
                <div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" onclick="submitWork(${bid.jobId})">Complete / Submit</button></div>
            ` : `<p style="font-size:0.875rem;color:var(--success);font-weight:600;">Payment received!</p>`}
        </div>`;
    }).join('');
    lucide.createIcons();
}

async function submitWork(jobId) {
    try {
        await API.markJobCompleted(jobId);
        showToast('Work submitted! Waiting for client review.');
    } catch {
        GigDB.updateJob(jobId, { status: 'SUBMITTED' });
        showToast('Work submitted (offline mode)!');
    }
    renderFreelancerTaken();
}

// ============================================
// SHARED RENDERERS
// ============================================
function renderProfile() {
    const user = getSession();
    if (!user) return;
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const roleEl = document.getElementById('profile-role');
    const avatarEl = document.getElementById('profile-avatar');
    if (nameEl) nameEl.innerText = user.name;
    if (emailEl) emailEl.innerText = user.email;
    if (roleEl) roleEl.innerText = user.role === 'client' ? 'Client' : 'Freelancer';
    if (avatarEl) avatarEl.src = user.avatar;
}

function updatePassword() {
    const pw = document.getElementById('new-password');
    if (!pw || !pw.value) { showToast('Please enter a new password!', 'error'); return; }
    pw.value = '';
    showToast('Password updated successfully!');
}

function renderHistory() {
    const user = getSession();
    if (!user) return;
    const tbody = document.getElementById('history-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="padding:2rem;text-align:center;color:var(--text-muted);">History will populate from completed jobs.</td></tr>`;
}

function renderWallet() {
    // Wallet data comes from backend transactions — show placeholder until backend is connected
    const el1 = document.getElementById('wallet-balance');
    const el2 = document.getElementById('wallet-escrow');
    const el3 = document.getElementById('wallet-total');
    if (el1) el1.innerText = '₹0';
    if (el2) el2.innerText = '₹0';
    if (el3) el3.innerText = '₹0';
}
