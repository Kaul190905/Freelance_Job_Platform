const API_BASE = 'http://localhost:8080/api';

const GigDB = {
    login(userData) { localStorage.setItem('gf_session', JSON.stringify(userData)); },
    logout() { localStorage.removeItem('gf_session'); },
    currentUser() { return JSON.parse(localStorage.getItem('gf_session')); },
    getToken() { const user = this.currentUser(); return user ? user.token : null; },
    
    async authFetch(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
            'Authorization': token ? `Bearer ${token}` : ''
        };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) { this.logout(); window.location.href = 'auth.html'; return; }
        return res;
    }
};

// ============================================
// Auth Logic
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const user = GigDB.currentUser();

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

            try {
                if (isSignup) {
                    const name = document.getElementById('auth-name').value;
                    const res = await fetch(`${API_BASE}/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, email, password, role })
                    });
                    if (!res.ok) throw new Error(await res.text());
                    showToast('Registration successful! Please login.', 'success');
                    // Toggle to login
                    toggleBtn.click();
                } else {
                    const res = await fetch(`${API_BASE}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    if (!res.ok) throw new Error('Invalid email or password');
                    
                    const data = await res.json();
                    if (data.role !== role) {
                        showToast(`Invalid role selection for this account.`, 'error');
                        return;
                    }
                    
                    GigDB.login({ 
                        ...data, 
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` 
                    });
                    
                    window.location.href = role === 'CLIENT' ? 'dash-client.html' : 'dash-freelancer.html';
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // --- Logout ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            GigDB.logout();
            window.location.href = 'index.html';
        });
    }

    // --- Guard dashboards ---
    if ((window.location.pathname.includes('dash-')) && !user) {
        window.location.href = 'auth.html';
        return;
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
        if (viewId === 'view-projects') await renderClientProjects();
        if (viewId === 'view-explore') await renderFreelancerJobs();
        if (viewId === 'view-taken') await renderFreelancerTaken();
        // if (viewId === 'view-history') await renderHistory();
        // if (viewId === 'view-wallet') await renderWallet();
        // if (viewId === 'view-profile') await renderProfile();
    };

    // ============================================
    // CLIENT DASHBOARD RENDERERS
    // ============================================
    if (window.location.pathname.includes('dash-client.html') && user) {
        renderClientProjects();
    }

    // ============================================
    // FREELANCER DASHBOARD RENDERERS
    // ============================================
    if (window.location.pathname.includes('dash-freelancer.html') && user) {
        renderFreelancerJobs();
    }
});

// ============================================
// UI Helpers
// ============================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'glass animate-fade';
    toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem;
        padding: 1rem 2rem; border-radius: 12px; z-index: 2000;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};
        color: white; font-weight: 600; box-shadow: var(--shadow-lg);
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ============================================
// CLIENT RENDERERS
// ============================================
async function renderClientProjects() {
    const user = GigDB.currentUser();
    if (!user) return;
    const container = document.getElementById('projects-list');
    const bidsPanel = document.getElementById('quick-bids');
    if (!container) return;

    try {
        const res = await GigDB.authFetch(`${API_BASE}/client/my-jobs`);
        const jobs = await res.json();

        if (jobs.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center; padding:3rem; color: var(--text-muted);"><i data-lucide="inbox" style="width:48px;height:48px;margin:0 auto 1rem;"></i><p>No projects yet. Post your first job!</p></div>`;
            if (bidsPanel) bidsPanel.innerHTML = '';
            lucide.createIcons();
            return;
        }

        container.innerHTML = jobs.map(job => {
            const statusMap = {
                'OPEN': { label: 'OPEN FOR BIDS', color: 'var(--success)' },
                'HIRED': { label: 'IN PROGRESS', color: 'var(--secondary)' },
                'IN_PROGRESS': { label: 'WORK SUBMITTED', color: 'var(--warning)' },
                'COMPLETED': { label: 'COMPLETED', color: 'var(--primary)' }
            };
            const st = statusMap[job.status] || statusMap.OPEN;

            let actions = '';
            if (job.status === 'OPEN') {
                actions = `<button class="btn btn-primary" style="font-size:0.8rem;padding:0.5rem 1rem;" onclick="renderBidsForJob(${job.id})">View Bids</button>`;
            } else if (job.status === 'IN_PROGRESS') {
                actions = `<button class="btn btn-primary" style="font-size:0.8rem;padding:0.5rem 1rem;" onclick="reviewAndPay(${job.id})">Release Payment</button>`;
            } else if (job.status === 'HIRED') {
                actions = `<span style="font-size:0.8rem;color:var(--text-muted);">Assigned to ${job.freelancerName || 'Freelancer'}</span>`;
            } else if (job.status === 'COMPLETED') {
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
                    <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">Posted ${timeAgo(job.createdAt)}</p>
                    <div style="display:flex;gap:0.5rem;">${actions}</div>
                </div>`;
        }).join('');
        lucide.createIcons();

        // Show bids for the first open job by default
        const firstOpen = jobs.find(j => j.status === 'OPEN');
        if (firstOpen && bidsPanel) renderBidsForJob(firstOpen.id);
        else if (bidsPanel) bidsPanel.innerHTML = '';
    } catch (err) {
        showToast('Failed to load projects', 'error');
    }
}

async function renderBidsForJob(jobId) {
    const bidsPanel = document.getElementById('quick-bids');
    if (!bidsPanel) return;
    
    try {
        const res = await GigDB.authFetch(`${API_BASE}/client/jobs/${jobId}/bids`);
        const bids = await res.json();

        if (bids.length === 0) {
            bidsPanel.innerHTML = `<h3 style="margin-bottom:1rem;font-size:1rem;">Proposals (0)</h3><p style="color:var(--text-muted);font-size:0.875rem;">No bids received yet.</p>`;
            return;
        }

        bidsPanel.innerHTML = `<h3 style="margin-bottom:1rem;font-size:1rem;">Proposals (${bids.length})</h3>` +
            bids.map(bid => `
                <div class="card glass animate-fade" style="padding:1rem;border-left:4px solid var(--primary);margin-bottom:1rem;">
                    <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:0.5rem;">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${bid.id}" style="width:32px;height:32px;border-radius:50%;background:#ddd;">
                        <div>
                            <p style="font-weight:700;font-size:0.85rem;">${bid.freelancerName}</p>
                            <p style="font-size:0.7rem;color:var(--text-muted);display:flex;align-items:center;gap:0.2rem;"><i data-lucide="star" style="width:10px;height:10px;fill:var(--warning);color:var(--warning);"></i> 4.5</p>
                        </div>
                    </div>
                    <p style="font-size:0.8rem;margin-bottom:1rem;">"${bid.proposal}"</p>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:800;font-size:0.9rem;">${formatCurrency(bid.amount)}</span>
                        ${bid.status === 'PENDING' ? `<button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.7rem;" onclick="assignFreelancer(${bid.id},'${bid.freelancerName}',${jobId})">Accept</button>` : `<span style="color:var(--success);font-weight:700;font-size:0.7rem;">Accepted</span>`}
                    </div>
                </div>
            `).join('');
        lucide.createIcons();
    } catch (err) {
        showToast('Failed to load bids', 'error');
    }
}

async function assignFreelancer(bidId, name, jobId) {
    try {
        const res = await GigDB.authFetch(`${API_BASE}/client/bids/${bidId}/accept`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to accept bid');
        showToast(`Job assigned to ${name}!`);
        await renderClientProjects();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function reviewAndPay(jobId) {
    // In this backend, we directly release payment
    if (confirm('Are you sure you want to release the payment?')) {
        try {
            const res = await GigDB.authFetch(`${API_BASE}/payment/release/${jobId}`, { method: 'PUT' });
            if (!res.ok) throw new Error('Failed to release payment');
            showToast('Payment released successfully!');
            await renderClientProjects();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

// Post Job
async function postNewJob() {
    const user = GigDB.currentUser();
    const title = document.getElementById('job-title').value;
    const desc = document.getElementById('job-desc').value;
    const budget = document.getElementById('job-budget').value;

    if (!title || !desc || !budget) { showToast('Please fill all fields!', 'error'); return; }

    try {
        const res = await GigDB.authFetch(`${API_BASE}/client/jobs`, {
            method: 'POST',
            body: JSON.stringify({ title, description: desc, budget: Number(budget) })
        });
        if (!res.ok) throw new Error('Failed to post job');
        showToast('Project posted successfully!');
        document.getElementById('post-form').reset();
        await switchView('view-projects');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================
// FREELANCER RENDERERS
// ============================================
async function renderFreelancerJobs() {
    const user = GigDB.currentUser();
    if (!user) return;
    const container = document.getElementById('job-feed');
    if (!container) return;

    try {
        const res = await GigDB.authFetch(`${API_BASE}/freelancer/jobs`);
        const jobs = await res.json();

        if (jobs.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);"><p>No jobs available right now. Check back later!</p></div>`;
            return;
        }

        container.innerHTML = jobs.map(job => {
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
                <div style="display:flex;justify-content:flex-end;">
                    <button class="btn btn-primary" onclick="openBidModal(${job.id},'${job.title.replace(/'/g, "\\'")}')">Place Bid</button>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        showToast('Failed to load job feed', 'error');
    }
}

async function submitBid() {
    const user = GigDB.currentUser();
    const modal = document.getElementById('bid-modal');
    const jobId = Number(modal.dataset.jobId);
    const amount = document.getElementById('bid-amount').value;
    const proposal = document.getElementById('bid-proposal').value;

    if (!amount || !proposal) { showToast('Please fill all fields!', 'error'); return; }

    try {
        const res = await GigDB.authFetch(`${API_BASE}/freelancer/bids`, {
            method: 'POST',
            body: JSON.stringify({ jobId, amount: Number(amount), proposal })
        });
        if (!res.ok) throw new Error('Failed to submit bid');
        
        modal.style.display = 'none';
        document.getElementById('bid-form').reset();
        showToast('Bid placed successfully!');
        await renderFreelancerJobs();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function renderFreelancerTaken() {
    const user = GigDB.currentUser();
    if (!user) return;
    const container = document.getElementById('taken-list');
    if (!container) return;

    try {
        const res = await GigDB.authFetch(`${API_BASE}/freelancer/my-bids`); 
        const bids = await res.json();
        
        // Filter for bids that were accepted (where the job is now assigned to this freelancer)
        const activeBids = bids.filter(b => b.status === 'ACCEPTED');

        if (activeBids.length === 0) {
            container.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text-muted);"><p>No assigned projects yet. Your accepted bids will appear here.</p></div>`;
            return;
        }

        // Note: In a real app, we might need a more detailed job object. 
        // Here we use the info available in the BidResponse.
        container.innerHTML = activeBids.map(bid => {
            return `
            <div class="card" style="margin-bottom:1.5rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:1.5rem;">
                    <div>
                        <h3 style="margin-bottom:0.25rem;">${bid.jobTitle}</h3>
                        <p style="font-size:0.8rem;color:var(--text-muted);">Status: <span style="color:var(--secondary);font-weight:700;">Accepted / In Progress</span></p>
                    </div>
                    <div style="text-align:right;">
                        <p style="font-weight:800;">${formatCurrency(bid.amount)}</p>
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;">
                    <button class="btn btn-primary" onclick="submitWork(${bid.jobId})">Complete / Submit</button>
                </div>
            </div>`;
        }).join('');
        lucide.createIcons();
    } catch (err) {
        showToast('Failed to load assigned projects', 'error');
    }
}

async function submitWork(jobId) {
    try {
        const res = await GigDB.authFetch(`${API_BASE}/freelancer/jobs/${jobId}/complete`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to submit work');
        showToast('Work submitted successfully!');
        await renderFreelancerTaken();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function submitWork(jobId) {
    GigDB.updateJob(jobId, { status: 'submitted', submittedWork: true });
    showToast('Work submitted! Waiting for client review & payment.');
    renderFreelancerTaken();
}

// ============================================
// SHARED RENDERERS (Profile, History, Wallet)
// ============================================
function renderProfile() {
    const user = GigDB.currentUser();
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
    const user = GigDB.currentUser();
    GigDB.updateUser(user.email, { password: pw.value });
    pw.value = '';
    showToast('Password updated successfully!');
}

function renderHistory() {
    const user = GigDB.currentUser();
    if (!user) return;
    const tbody = document.getElementById('history-body');
    if (!tbody) return;

    const history = GigDB.getHistory().filter(h =>
        h.clientEmail === user.email || h.freelancerEmail === user.email
    );

    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding:2rem;text-align:center;color:var(--text-muted);">No history yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = history.map(h => `
        <tr>
            <td style="padding:1rem 1.5rem;border-top:1px solid var(--border);">${h.jobTitle}</td>
            <td style="padding:1rem 1.5rem;border-top:1px solid var(--border);">${user.role === 'client' ? (h.freelancerName || '-') : (h.clientName || '-')}</td>
            <td style="padding:1rem 1.5rem;border-top:1px solid var(--border);color:var(--text-muted);">${h.date}</td>
            <td style="padding:1rem 1.5rem;border-top:1px solid var(--border);font-weight:700;">${formatCurrency(h.amount)}</td>
            <td style="padding:1rem 1.5rem;border-top:1px solid var(--border);"><span style="color:var(--success);font-weight:700;">${h.status}</span></td>
        </tr>
    `).join('');
}

function renderWallet() {
    const user = GigDB.currentUser();
    if (!user) return;
    const dbUser = GigDB.findUser(user.email);
    const wallet = dbUser?.wallet || { balance: 0, escrow: 0, totalSpent: 0, totalEarned: 0 };

    const el1 = document.getElementById('wallet-balance');
    const el2 = document.getElementById('wallet-escrow');
    const el3 = document.getElementById('wallet-total');

    if (user.role === 'client') {
        if (el1) el1.innerText = formatCurrency(wallet.balance || 0);
        if (el2) el2.innerText = formatCurrency(wallet.escrow || 0);
        if (el3) el3.innerText = formatCurrency(wallet.totalSpent || 0);
    } else {
        if (el1) el1.innerText = formatCurrency(wallet.balance || 0);
        if (el2) el2.innerText = formatCurrency(wallet.escrow || 0);
        if (el3) el3.innerText = formatCurrency(wallet.totalEarned || 0);
    }
}
