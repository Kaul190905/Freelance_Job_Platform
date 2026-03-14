// ============================================
// GigFlow - Dynamic Data Layer (localStorage)
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
    // --- Core Helpers ---
    _get(key) { return JSON.parse(localStorage.getItem(key)) || []; },
    _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

    // --- Users ---
    getUsers() { return this._get('gf_users'); },
    addUser(user) {
        const users = this.getUsers();
        user.id = Date.now();
        user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
        user.wallet = { balance: 0, escrow: 0, totalSpent: 0, totalEarned: 0 };
        users.push(user);
        this._set('gf_users', users);
        return user;
    },
    findUser(email) { return this.getUsers().find(u => u.email === email); },
    updateUser(email, updates) {
        const users = this.getUsers().map(u => u.email === email ? { ...u, ...updates } : u);
        this._set('gf_users', users);
    },

    // --- Session ---
    login(user) { this._set('gf_session', user); },
    logout() { localStorage.removeItem('gf_session'); },
    currentUser() { return JSON.parse(localStorage.getItem('gf_session')); },

    // --- Jobs ---
    getJobs() { return this._get('gf_jobs'); },
    addJob(job) {
        const jobs = this.getJobs();
        job.id = Date.now();
        job.status = 'open';
        job.createdAt = new Date().toISOString();
        job.assignedTo = null;
        job.submittedWork = false;
        job.paid = false;
        jobs.push(job);
        this._set('gf_jobs', jobs);
        return job;
    },
    updateJob(id, updates) {
        const jobs = this.getJobs().map(j => j.id === id ? { ...j, ...updates } : j);
        this._set('gf_jobs', jobs);
    },
    getJobsByClient(email) { return this.getJobs().filter(j => j.clientEmail === email); },
    getOpenJobs() { return this.getJobs().filter(j => j.status === 'open'); },
    getJobsForFreelancer(email) { return this.getJobs().filter(j => j.assignedTo === email); },

    // --- Bids ---
    getBids() { return this._get('gf_bids'); },
    addBid(bid) {
        const bids = this.getBids();
        bid.id = Date.now();
        bid.createdAt = new Date().toISOString();
        bids.push(bid);
        this._set('gf_bids', bids);
        return bid;
    },
    getBidsForJob(jobId) { return this.getBids().filter(b => b.jobId === jobId); },
    getBidsByFreelancer(email) { return this.getBids().filter(b => b.freelancerEmail === email); },

    // --- History ---
    getHistory() { return this._get('gf_history'); },
    addHistory(entry) {
        const history = this.getHistory();
        entry.id = Date.now();
        entry.date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        history.push(entry);
        this._set('gf_history', history);
    },

    // --- Seed Data (first visit only) ---
    seed() {
        if (localStorage.getItem('gf_seeded')) return;

        // Seed users
        this.addUser({ name: 'Alex Client', email: 'alex@techcorp.com', password: '123456', role: 'client' });
        this.addUser({ name: 'Sarah Dev', email: 'sarah@dev.com', password: '123456', role: 'freelancer' });
        this.addUser({ name: 'Rahul Sharma', email: 'rahul@design.com', password: '123456', role: 'freelancer' });

        // Seed jobs
        const j1 = this.addJob({ title: 'E-commerce Website Redesign', description: 'Convert Shopify store to custom React frontend.', budget: 150000, deadline: '2026-04-01', clientEmail: 'alex@techcorp.com', clientName: 'Alex Client' });
        const j2 = this.addJob({ title: 'Python Backend API', description: 'Build REST API for investment platform using FastAPI.', budget: 200000, deadline: '2026-04-15', clientEmail: 'alex@techcorp.com', clientName: 'Alex Client' });

        // Seed bids
        this.addBid({ jobId: j1.id, jobTitle: j1.title, freelancerEmail: 'sarah@dev.com', freelancerName: 'Sarah Dev', amount: 140000, proposal: 'I can finish this in 4 days. Expert in React & Shopify.', rating: 4.8 });
        this.addBid({ jobId: j1.id, jobTitle: j1.title, freelancerEmail: 'rahul@design.com', freelancerName: 'Rahul Sharma', amount: 130000, proposal: 'UI/UX specialist with 3 years experience in e-commerce.', rating: 4.5 });
        this.addBid({ jobId: j2.id, jobTitle: j2.title, freelancerEmail: 'sarah@dev.com', freelancerName: 'Sarah Dev', amount: 185000, proposal: 'Senior Python developer. Can deliver production-ready API.', rating: 4.8 });

        localStorage.setItem('gf_seeded', 'true');
    }
};

// Seed on first load
GigDB.seed();

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
            const role = document.querySelector('input[name="role"]:checked').value.toUpperCase(); // CLIENT or FREELANCER
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const submitBtn = document.getElementById('auth-submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Please wait...';

            if (isSignup) {
                const name = document.getElementById('auth-name').value;
                if (GigDB.findUser(email)) {
                    showToast('Account already exists! Please login.', 'error');
                    return;
                }
                GigDB.addUser({ name, email, password, role });
                GigDB.login({ name, email, role, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` });
            } else {
                const found = GigDB.findUser(email);
                if (!found || found.password !== password) {
                    showToast('Invalid email or password!', 'error');
                    return;
                }
                if (found.role !== role) {
                    showToast(`This account is registered as ${found.role}. Please select the correct role.`, 'error');
                    return;
                }
                GigDB.login({ name: found.name, email: found.email, role: found.role, avatar: found.avatar });
            }
            window.location.href = role === 'client' ? 'dash-client.html' : 'dash-freelancer.html';
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
    window.switchView = async (viewId) => {
        document.querySelectorAll('.dashboard-view').forEach(v => v.style.display = 'none');
        const target = document.getElementById(viewId);
        if (target) target.style.display = 'block';
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('onclick')?.includes(viewId));
        });
        // Trigger render on view switch
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
function renderClientProjects() {
    const user = GigDB.currentUser();
    if (!user) return;
    const container = document.getElementById('projects-list');
    const bidsPanel = document.getElementById('quick-bids');
    if (!container) return;

    const jobs = GigDB.getJobsByClient(user.email);

    if (jobs.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center; padding:3rem; color: var(--text-muted);"><i data-lucide="inbox" style="width:48px;height:48px;margin:0 auto 1rem;"></i><p>No projects yet. Post your first job!</p></div>`;
        if (bidsPanel) bidsPanel.innerHTML = '';
        lucide.createIcons();
        return;
    }

    container.innerHTML = jobs.map(job => {
        const bids = GigDB.getBidsForJob(job.id);
        const statusMap = {
            open: { label: 'OPEN FOR BIDS', color: 'var(--success)' },
            assigned: { label: 'IN PROGRESS', color: 'var(--secondary)' },
            submitted: { label: 'WORK SUBMITTED', color: 'var(--warning)' },
            completed: { label: 'COMPLETED', color: 'var(--primary)' }
        };
        const st = statusMap[job.status] || statusMap.open;

        let actions = '';
        if (job.status === 'open') {
            actions = `<button class="btn btn-primary" style="font-size:0.8rem;padding:0.5rem 1rem;" onclick="renderBidsForJob(${job.id})">Show ${bids.length} Bid${bids.length !== 1 ? 's' : ''}</button>`;
        } else if (job.status === 'submitted') {
            actions = `<button class="btn btn-primary" style="font-size:0.8rem;padding:0.5rem 1rem;" onclick="reviewAndPay(${job.id})">Review & Pay</button>`;
        } else if (job.status === 'assigned') {
            actions = `<span style="font-size:0.8rem;color:var(--text-muted);">Assigned to ${job.assignedTo}</span>`;
        } else if (job.status === 'completed') {
            actions = `<span style="font-size:0.8rem;color:var(--success);font-weight:700;">Paid & Completed</span>`;
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
                <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Deadline: ${job.deadline} • Posted ${timeAgo(job.createdAt)}</p>
                <div style="display:flex;gap:0.5rem;">${actions}</div>
            </div>`;
    }).join('');
    lucide.createIcons();

    // Show bids for the first open job by default
    const firstOpen = jobs.find(j => j.status === 'open');
    if (firstOpen && bidsPanel) renderBidsForJob(firstOpen.id);
    else if (bidsPanel) bidsPanel.innerHTML = '';
}

async function renderBidsForJob(jobId) {
    const bidsPanel = document.getElementById('quick-bids');
    if (!bidsPanel) return;
    const bids = GigDB.getBidsForJob(jobId);

    if (bids.length === 0) {
        bidsPanel.innerHTML = `<h3 style="margin-bottom:1rem;font-size:1rem;">Proposals (0)</h3><p style="color:var(--text-muted);font-size:0.875rem;">No bids received yet.</p>`;
        return;
    }

    bidsPanel.innerHTML = `<h3 style="margin-bottom:1rem;font-size:1rem;">Proposals (${bids.length})</h3>` +
        bids.map(bid => `
            <div class="card glass animate-fade" style="padding:1rem;border-left:4px solid var(--primary);margin-bottom:1rem;">
                <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:0.5rem;">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${bid.freelancerEmail}" style="width:32px;height:32px;border-radius:50%;background:#ddd;">
                    <div>
                        <p style="font-weight:700;font-size:0.85rem;">${bid.freelancerName}</p>
                        <p style="font-size:0.7rem;color:var(--text-muted);display:flex;align-items:center;gap:0.2rem;"><i data-lucide="star" style="width:10px;height:10px;fill:var(--warning);color:var(--warning);"></i> ${bid.rating}</p>
                    </div>
                </div>
                <p style="font-size:0.8rem;margin-bottom:1rem;">"${bid.proposal}"</p>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:800;font-size:0.9rem;">${formatCurrency(bid.amount)}</span>
                    <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.7rem;" onclick="assignFreelancer('${bid.freelancerEmail}','${bid.freelancerName}',${jobId})">Assign</button>
                </div>
            </div>
        `).join('');
    lucide.createIcons();
}

function assignFreelancer(email, name, jobId) {
    GigDB.updateJob(jobId, { status: 'assigned', assignedTo: email, assignedName: name });
    showToast(`Job assigned to ${name}!`);
    renderClientProjects();
}

function reviewAndPay(jobId) {
    const job = GigDB.getJobs().find(j => j.id === jobId);
    if (!job) return;
    const modal = document.getElementById('rate-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.dataset.jobId = jobId;
        document.getElementById('rate-modal-title').innerText = `Review: ${job.title}`;
        document.getElementById('rate-modal-freelancer').innerText = `Freelancer: ${job.assignedName || job.assignedTo}`;
    }
}

function submitReviewAndPay() {
    const modal = document.getElementById('rate-modal');
    const jobId = Number(modal.dataset.jobId);
    const review = document.getElementById('rate-review-text').value;

    const job = GigDB.getJobs().find(j => j.id === jobId);
    GigDB.updateJob(jobId, { status: 'completed', paid: true });

    // Add to history for both client and freelancer
    GigDB.addHistory({ jobTitle: job.title, amount: job.budget, clientEmail: job.clientEmail, freelancerEmail: job.assignedTo, freelancerName: job.assignedName, clientName: job.clientName, type: 'payment', review: review, status: 'Paid' });

    // Update wallet data on users
    const clientUser = GigDB.findUser(job.clientEmail);
    if (clientUser) {
        GigDB.updateUser(job.clientEmail, {
            wallet: { ...clientUser.wallet, totalSpent: (clientUser.wallet?.totalSpent || 0) + job.budget, balance: (clientUser.wallet?.balance || 0) - job.budget }
        });
    }
    const flUser = GigDB.findUser(job.assignedTo);
    if (flUser) {
        GigDB.updateUser(job.assignedTo, {
            wallet: { ...flUser.wallet, totalEarned: (flUser.wallet?.totalEarned || 0) + job.budget, balance: (flUser.wallet?.balance || 0) + job.budget }
        });
    }

    modal.style.display = 'none';
    showToast(`Payment of ${formatCurrency(job.budget)} released to ${job.assignedName}!`);
    renderClientProjects();
}

// Post Job
function postNewJob() {
    const user = GigDB.currentUser();
    const title = document.getElementById('job-title').value;
    const desc = document.getElementById('job-desc').value;
    const budget = document.getElementById('job-budget').value;

    if (!title || !desc || !deadline || !budget) { showToast('Please fill all fields!', 'error'); return; }

    GigDB.addJob({ title, description: desc, budget: Number(budget), deadline, clientEmail: user.email, clientName: user.name });
    showToast('Project posted successfully!');
    document.getElementById('post-form').reset();
    switchView('view-projects');
}

// ============================================
// FREELANCER DASHBOARD
// ============================================
function renderFreelancerJobs() {
    const user = GigDB.currentUser();
    if (!user) return;
    const container = document.getElementById('job-feed');
    if (!container) return;

    const jobs = GigDB.getOpenJobs();
    // Exclude jobs where this freelancer already bid
    const myBids = GigDB.getBidsByFreelancer(user.email).map(b => b.jobId);

    if (jobs.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);"><p>No jobs available right now. Check back later!</p></div>`;
        return;
    }

    container.innerHTML = jobs.map(job => {
        const alreadyBid = myBids.includes(job.id);
        return `
        <div class="card" style="margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <h3 style="color:var(--primary);">${job.title}</h3>
                    <p style="font-size:0.75rem;color:var(--text-muted);margin:0.5rem 0;">Posted by ${job.clientName} • ${timeAgo(job.createdAt)}</p>
                </div>
                <span style="font-weight:800;">${formatCurrency(job.budget)}</span>
            </div>
            <p style="color:var(--text-muted);font-size:0.875rem;margin:1rem 0;">${job.description}</p>
            <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Deadline: ${job.deadline}</p>
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

function submitBid() {
    const user = GigDB.currentUser();
    const modal = document.getElementById('bid-modal');
    const jobId = Number(modal.dataset.jobId);
    const amount = document.getElementById('bid-amount').value;
    const proposal = document.getElementById('bid-proposal').value;
    if (!amount || !proposal) { showToast('Please fill all fields!', 'error'); return; }

    const job = GigDB.getJobs().find(j => j.id === jobId);
    GigDB.addBid({ jobId, jobTitle: job.title, freelancerEmail: user.email, freelancerName: user.name, amount: Number(amount), proposal, rating: 4.5 });

    modal.style.display = 'none';
    document.getElementById('bid-form').reset();
    showToast('Bid placed successfully!');
    renderFreelancerJobs();
}

function renderFreelancerTaken() {
    const user = GigDB.currentUser();
    if (!user) return;
    const container = document.getElementById('taken-list');
    if (!container) return;

    const jobs = GigDB.getJobsForFreelancer(user.email);

    if (jobs.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);"><p>No assigned projects yet. Place bids to get started!</p></div>`;
        return;
    }

    container.innerHTML = jobs.map(job => {
        const statusMap = {
            assigned: { label: 'In Progress', color: 'var(--secondary)' },
            submitted: { label: 'Submitted - Awaiting Payment', color: 'var(--warning)' },
            completed: { label: 'Completed & Paid', color: 'var(--success)' }
        };
        const st = statusMap[job.status] || statusMap.assigned;

        let actions = '';
        if (job.status === 'assigned') {
            actions = `
                <div style="background:var(--bg-main);padding:1.5rem;border-radius:var(--radius-md);border:1px dashed var(--border);text-align:center;margin-bottom:1.5rem;">
                    <i data-lucide="upload-cloud" style="width:32px;height:32px;color:var(--text-muted);margin-bottom:0.5rem;"></i>
                    <p style="font-size:0.875rem;color:var(--text-muted);">Upload your project work</p>
                </div>
                <div style="display:flex;justify-content:flex-end;">
                    <button class="btn btn-primary" onclick="submitWork(${job.id})">Complete / Submit</button>
                </div>`;
        } else if (job.status === 'submitted') {
            actions = `<p style="font-size:0.875rem;color:var(--warning);font-weight:600;">Awaiting client review & payment...</p>`;
        } else {
            actions = `<p style="font-size:0.875rem;color:var(--success);font-weight:600;">Payment received!</p>`;
        }

        return `
        <div class="card" style="margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:1.5rem;">
                <div>
                    <h3 style="margin-bottom:0.25rem;">${job.title}</h3>
                    <p style="font-size:0.8rem;color:var(--text-muted);">Status: <span style="color:${st.color};font-weight:700;">${st.label}</span></p>
                </div>
                <div style="text-align:right;">
                    <p style="font-weight:800;">${formatCurrency(job.budget)}</p>
                    <p style="font-size:0.7rem;color:var(--text-muted);">Deadline: ${job.deadline}</p>
                </div>
            </div>
            ${actions}
        </div>`;
    }).join('');
    lucide.createIcons();
}

function submitWork(jobId) {
    GigDB.updateJob(jobId, { status: 'submitted', submittedWork: true });
    showToast('Work submitted! Waiting for client review & payment.');
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
