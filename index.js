const API_BASE = window.location.origin + '/api';
let authToken = localStorage.getItem('erp_token') || null;
let authRole  = localStorage.getItem('erp_role') || null;
let authUser  = localStorage.getItem('erp_username') || null;
let currentFormMode = 'regular';
let posCart = [];

// Company settings (configurable via DB/localStorage)
const COMPANY = {
    name: localStorage.getItem('company_name') || 'SUPER SHOP',
    tagline: localStorage.getItem('company_tagline') || 'Your Neighborhood Market',
    address: localStorage.getItem('company_address') || 'House 12, Road 5, Agrabad',
    city: localStorage.getItem('company_city') || 'Chattogram, Bangladesh',
    phone: localStorage.getItem('company_phone') || '+880 1XXX-XXXXXX',
    email: localStorage.getItem('company_email') || 'support@supershop.com',
    website: localStorage.getItem('company_website') || 'www.supershop.com',
    vat_reg: localStorage.getItem('company_vat_reg') || '123456789',
    invoice_prefix: localStorage.getItem('invoice_prefix') || 'INV-',
    branch: localStorage.getItem('company_branch') || 'Main Branch',
    return_policy: localStorage.getItem('return_policy') || 'Returns accepted within 7 days with original receipt',
    footer_text: localStorage.getItem('footer_text') || 'Please visit again',
    receipt_logo: localStorage.getItem('receipt_logo') || '\u{1F4B0}',
    vat_rate: parseFloat(localStorage.getItem('vat_rate')) || 5
};

// Redirect to login if not authenticated (skip for login page itself)
if (!authToken && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
}

function getAuthHeaders(extra) {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = 'Bearer ' + authToken;
    return extra ? { ...h, ...extra } : h;
}

async function api(method, path, body) {
    const opts = { method, headers: getAuthHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (data && data.msg && (data.msg.includes('expired') || data.msg.includes('Token') || data.msg.includes('logged out'))) {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_username');
        localStorage.removeItem('erp_role');
        window.location.href = '/login.html';
    }
    return data;
}

function showToast(msg, type) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function lucideRefresh() { if (window.lucide) lucide.createIcons(); }
function formatCurrency(v) { return '\u09F3' + parseFloat(v || 0).toFixed(2); }

// ----- AUTH -----
function updateAuthUI() {
    const ddUname = document.getElementById('dd-username');
    const ddRole = document.getElementById('dd-role');
    const tbUname = document.getElementById('topbar-username');
    const loginBtn = document.getElementById('btn-login');
    const signoutBtn = document.getElementById('btn-signout');
    const signoutDd = document.getElementById('btn-signout-dd');
    const loginDd = document.getElementById('btn-login-dd');
    const chgpwBtn = document.getElementById('btn-change-pw');
    const floatBadge = document.getElementById('user-float');
    const floatUname = document.getElementById('float-username');
    const floatRole = document.getElementById('float-role');
    if (authToken && authUser) {
        if (ddUname) ddUname.textContent = authUser;
        if (ddRole) ddRole.textContent = authRole || '';
        if (tbUname) tbUname.textContent = authUser;
        if (loginBtn) loginBtn.classList.add('hidden');
        if (signoutBtn) signoutBtn.classList.remove('hidden');
        if (signoutDd) signoutDd.classList.remove('hidden');
        if (loginDd) loginDd.classList.add('hidden');
        if (chgpwBtn) chgpwBtn.classList.remove('hidden');
        if (floatBadge) floatBadge.classList.remove('hidden');
        if (floatUname) floatUname.textContent = authUser;
        if (floatRole) floatRole.textContent = authRole || '';
    } else {
        if (ddUname) ddUname.textContent = 'Not signed in';
        if (ddRole) ddRole.textContent = '';
        if (tbUname) tbUname.textContent = 'Sign In';
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (signoutBtn) signoutBtn.classList.add('hidden');
        if (signoutDd) signoutDd.classList.add('hidden');
        if (loginDd) loginDd.classList.remove('hidden');
        if (chgpwBtn) chgpwBtn.classList.add('hidden');
        if (floatBadge) floatBadge.classList.add('hidden');
    }
    lucideRefresh();
}

function showLoginModal() { const m = document.getElementById('login-modal'); if (m) m.classList.remove('hidden'); }
function hideLoginModal() { const m = document.getElementById('login-modal'); if (m) m.classList.add('hidden'); }

async function submitLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!username || !password) { showToast('Fill in credentials', 'error'); return; }
    const res = await api('POST', '/auth/login', { username, password });
    if (res.success) {
        authToken = res.token; authRole = res.role; authUser = res.username;
        localStorage.setItem('erp_token', authToken);
        localStorage.setItem('erp_role', authRole);
        localStorage.setItem('erp_username', authUser);
        hideLoginModal(); updateAuthUI();
        applyRoleNav();
        showToast('Welcome, ' + authUser + '!', 'success');
        // Switch to the first allowed view
        const first = document.querySelector('.nav-item:not([style*="display: none"])');
        if (first) switchView(first.dataset.target);
    } else {
        showToast(res.error || 'Login failed', 'error');
    }
}

function logout() {
    authToken = null; authRole = null; authUser = null;
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_role');
    localStorage.removeItem('erp_username');
    window.location.href = '/login.html';
}

// ----- NAVIGATION -----
function applyRoleNav() {
    const role = authRole || '';
    document.querySelectorAll('.nav-item[data-roles]').forEach(btn => {
        const allowed = (btn.dataset.roles || '').split(',').map(r => r.trim());
        btn.style.display = allowed.includes(role) ? '' : 'none';
    });
    // If current view is not allowed, switch to first visible
    const active = document.querySelector('.nav-item.active');
    if (!active || active.style.display === 'none') {
        const first = document.querySelector('.nav-item[style*="display: none"]') === null
            ? document.querySelector('.nav-item:not([style*="display: none"])')
            : document.querySelector('.nav-item');
        if (first) switchView(first.dataset.target);
    }
}

function switchView(targetId) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (navBtn) navBtn.classList.add('active');
    const view = document.getElementById(targetId);
    if (view) view.classList.add('active');
    lucideRefresh();
    switch (targetId) {
        case 'view-dashboard': loadDashboard(); loadFullDashboard(); break;
        case 'view-inventory': loadInventoryView(); break;
        case 'view-pos': loadPosView(); break;
        case 'view-branches': loadBranches(); break;
        case 'view-purchases': loadPurchaseView(); break;
        case 'view-sales': loadSales(); break;
        case 'view-customers': loadCustomersView(); break;
        case 'view-vat': loadVatRates(); break;
        case 'view-barcode': { const bi = document.getElementById('barcode-input'); if (bi) bi.focus(); } break;
        case 'view-analytics': loadAnalytics(); break;
        case 'view-wastage': loadWastageView(); break;
        case 'view-suppliers': loadSuppliersView(); break;
        case 'view-users': loadUsers(); break;
        case 'view-products': loadEnhancedProducts(); loadProductCategories(); break;
        case 'view-stock-transfer': loadTransferBranches(); loadTransferProducts(); break;
        case 'view-stock-audit': loadAuditBranches(); loadAuditProducts(); loadAuditHistory(); break;
        case 'view-purchase-returns': loadPRSuppliers(); loadPRProducts(); loadPurchaseReturnHistory(); break;
        case 'view-grn': loadGrnBranches(); loadGRNHistory(); break;
        case 'view-sales-returns': loadSRProducts(); loadSalesReturnHistory(); break;
        case 'view-widgets': loadFullDashboard(); break;
        case 'view-accounting': switchAccountingTab('acct-journal'); loadAccountHeadsForJournal(); loadAccountHeads('ledger-head-filter'); loadTrialBalance(); loadAccountTree(); loadVouchers(); break;
        case 'view-reports': loadCashBook(); loadBankBook(); loadCashFlowReport(); loadIncomeStatement(); break;
        case 'view-audit-log': switchAuditTab('audit-logs'); loadSystemLogs(); break;
        case 'view-api-docs': break;
        case 'view-backups': loadBackupHistory(); break;
        case 'view-settings': loadSettings(); break;
    }
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
        switchView(this.dataset.target);
    });
});

// ----- DASHBOARD -----
async function loadDashboard() {
    try {
        const [fin, full] = await Promise.all([
            api('GET', '/financials'),
            api('GET', '/dashboard/full')
        ]);

        // KPI card labels (from /financials)
        const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        if (full && full.success) {
            setStat('lbl-total-revenue', formatCurrency(full.month_sales));
            setStat('lbl-net-profit', formatCurrency(full.profit));

            const wTbody = document.querySelector('#tbl-wastage-history-dash tbody');
            if (wTbody) wTbody.innerHTML = '<tr class="empty-state"><td colspan="4">No wastage recorded</td></tr>';
        }

        // Mini stats (from /financials)
        if (fin && fin.success) {
            const s = fin.summary;
            setStat('stat-sale-count', s.sale_count);
            setStat('stat-active-products', s.active_products);
            setStat('stat-inventory-value', formatCurrency(s.inventory_value));
            setStat('stat-total-customers', s.total_customers);
            setStat('stat-total-suppliers', s.total_suppliers);
            setStat('stat-branches', s.branches);
            setStat('stat-today-sales', formatCurrency(fin.today_sales));
            setStat('stat-weekly-sales', formatCurrency(fin.weekly_sales));
            setStat('stat-monthly-sales', formatCurrency(fin.monthly_sales));
            const ls = document.getElementById('stat-low-stock');
            if (ls) { ls.textContent = s.low_stock_alerts; ls.style.color = s.low_stock_alerts > 0 ? 'var(--danger)' : 'var(--success)'; }
        }

        // Charts with data from /dashboard/full
        if (full && full.success) {
            renderDashCharts(full);
        }

        // Recent activity
        const actBox = document.getElementById('dash-recent-activity');
        if (actBox) {
            try {
                const salesRes = await api('GET', '/sales');
                let html = '';
                if (salesRes.success && salesRes.sales && salesRes.sales.length) {
                    salesRes.sales.slice(0, 5).forEach(s => {
                        html += '<div class="activity-item"><div class="act-icon act-sale"><i data-lucide="shopping-cart"></i></div><div class="act-text">Sale <strong>#' + s.sale_id + '</strong> - ' + formatCurrency(s.total_amount) + '</div><span class="act-time">' + (s.created_at ? s.created_at.slice(11,16) : '') + '</span></div>';
                    });
                }
                if (!html) html = '<p class="chart-empty">No recent activity</p>';
                actBox.innerHTML = html;
                lucideRefresh();
            } catch(e) {}
        }

        // Supplier summary
        const sTbody = document.querySelector('#tbl-supplier-summary-dash tbody');
        if (sTbody) {
            try {
                const supRes = await api('GET', '/suppliers');
                if (supRes.success && supRes.suppliers && supRes.suppliers.length) {
                    sTbody.innerHTML = supRes.suppliers.map(sup =>
                        '<tr><td>' + (sup.name||'') + '</td><td>' + formatCurrency(sup.total_invoiced||0) + '</td><td>' + formatCurrency(sup.total_settled||0) + '</td><td>' + formatCurrency((sup.total_invoiced||0) - (sup.total_settled||0)) + '</td></tr>'
                    ).join('');
                } else {
                    sTbody.innerHTML = '<tr class="empty-state"><td colspan="4">No suppliers</td></tr>';
                }
            } catch(e) {}
        }

        lucideRefresh();
    } catch (e) {
        showToast('Dashboard load error: ' + e.message, 'error');
    }
}

let chartInstances = {};
function destroyCharts() {
    Object.values(chartInstances).forEach(c => { if (c) c.destroy(); });
    chartInstances = {};
}
function renderDashCharts(d) {
    if (typeof Chart === 'undefined') return;
    destroyCharts();
    const commonOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#c4b5fd', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#8b7aa0' } }, y: { ticks: { color: '#8b7aa0' } } } };
    // Sales Trend (Line)
    const stCtx = document.getElementById('chart-sales-trend');
    if (stCtx && d.sales_timeline && d.sales_timeline.length) {
        chartInstances.salesTrend = new Chart(stCtx, {
            type: 'line',
            data: { labels: d.sales_timeline.map(s => { const p = s.date ? s.date.slice(5,10) : ''; return p; }), datasets: [{ label: 'Sales', data: d.sales_timeline.map(s => s.total_sales), borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)', fill: true, tension: 0.3 }] },
            options: { ...commonOpts, plugins: { ...commonOpts.plugins, legend: { display: false } } }
        });
    }
    // Revenue vs Expense (Bar)
    const reCtx = document.getElementById('chart-rev-expense');
    if (reCtx && d.monthly_profit && d.monthly_profit.length) {
        const mp = d.monthly_profit;
        chartInstances.revExpense = new Chart(reCtx, {
            type: 'bar',
            data: { labels: mp.map(m => m.month), datasets: [{ label: 'Revenue', data: mp.map(m => m.sales), backgroundColor: '#7c3aed' }, { label: 'Expense', data: mp.map(m => m.cogs), backgroundColor: '#ef4444' }] },
            options: commonOpts
        });
    }
    // Category Sales (Pie)
    const cpCtx = document.getElementById('chart-category-pie');
    if (cpCtx && d.category_sales && d.category_sales.length) {
        const colors = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316'];
        chartInstances.categoryPie = new Chart(cpCtx, {
            type: 'pie',
            data: { labels: d.category_sales.map(c => c.category), datasets: [{ data: d.category_sales.map(c => c.total), backgroundColor: colors.slice(0, d.category_sales.length) }] },
            options: { ...commonOpts, scales: {} }
        });
    }
    // Monthly Profit (Area)
    const mpCtx = document.getElementById('chart-monthly-profit');
    if (mpCtx && d.monthly_profit && d.monthly_profit.length) {
        chartInstances.monthlyProfit = new Chart(mpCtx, {
            type: 'line',
            data: { labels: d.monthly_profit.map(m => m.month), datasets: [{ label: 'Profit', data: d.monthly_profit.map(m => m.profit), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3 }] },
            options: { ...commonOpts, plugins: { ...commonOpts.plugins, legend: { display: false } } }
        });
    }
}

// ----- INVENTORY / PRODUCT INTAKE -----
function setFormMode(mode) {
    currentFormMode = mode;
}

function calculateMarginRecommendation() {}

async function handleProductSubmit(e) {
    e.preventDefault();
    const data = {};
    data.title = document.getElementById('product-title').value.trim();
    data.cost_price = parseFloat(document.getElementById('cost-price').value) || 0;
    data.selling_price = parseFloat(document.getElementById('selling-price').value) || 0;
    data.supplier_name = document.getElementById('supplier-name').value.trim() || null;

    const sku = document.getElementById('veg-barcode').value.trim();
    data.sku_barcode = sku || null;
    data.unit_of_measure = document.getElementById('veg-uom').value.trim() || 'KG';
    data.current_stock = parseFloat(document.getElementById('veg-intake-qty').value) || 0;

    if (!data.title) { showToast('Product title is required', 'error'); return; }
    const res = await api('POST', '/products', data);
    if (res.success) {
        showToast('Product added! Barcode: ' + (res.sku_barcode || 'auto'), 'success');
        document.getElementById('product-entry-form').reset();
        document.getElementById('veg-uom').value = 'KG';
        loadInventoryTable();
    } else {
        showToast(res.error || 'Failed to add product', 'error');
    }
}

async function loadInventoryView() {
    await loadInventoryTable();
    await loadPriceConfigurator();
}

async function loadInventoryTable() {
    const search = (document.getElementById('inventory-search')?.value || '').trim().toLowerCase();
    try {
        const res = await api('GET', '/products?_=' + Date.now());
        const prods = Array.isArray(res) ? res : (res.products || []);
        const tbody = document.querySelector('#tbl-active-inventory tbody');
        if (!tbody) return;
        let filtered = prods;
        if (search) filtered = prods.filter(p =>
            (p.title||'').toLowerCase().includes(search) ||
            (p.sku_barcode||'').toLowerCase().includes(search)
        );
        if (filtered.length) {
            tbody.innerHTML = filtered.map(p =>
                '<tr><td><strong>' + (p.title||'') + '</strong><br><small>' + (p.unit_of_measure||'') + '</small></td>' +
                '<td>' + (p.category_name || (p.category_id ? 'Categorized' : '\u2014')) + '</td>' +
                '<td>' + (p.sku_barcode||'\u2014') + '</td>' +
                '<td>' + formatCurrency(p.cost_price||0) + '</td>' +
                '<td>' + formatCurrency(p.selling_price||0) + '</td>' +
                '<td>' + (p.current_stock !== undefined ? p.current_stock : '\u2014') + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="6">No inventory records found.</td></tr>';
        }
        lucideRefresh();
    } catch (e) { showToast('Failed to load inventory', 'error'); }
}

async function loadPriceConfigurator() {
    try {
        const res = await api('GET', '/products?_=' + Date.now());
        const prods = Array.isArray(res) ? res : (res.products || []);
        const tbody = document.querySelector('#tbl-price-configurator tbody');
        if (!tbody) return;
        if (prods.length) {
            tbody.innerHTML = prods.map(p =>
                '<tr><td>' + (p.title||'') + '</td><td>' + (p.unit_of_measure||'') + '</td><td>' +
                (p.current_stock || 0) + '</td><td><input type="number" class="cost-adjust" data-pid="' +
                p.product_id + '" value="' + (p.cost_price||0) + '" step="0.01" style="width:90px;"></td><td>' +
                formatCurrency(p.selling_price||0) + '</td><td><input type="number" class="price-adjust" data-pid="' +
                p.product_id + '" value="' + (p.selling_price||0) + '" step="0.01" style="width:90px;"></td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="6">No products found.</td></tr>';
        }
        lucideRefresh();
    } catch (e) {}
}

async function saveFloatingPrices(e) {
    e.preventDefault();
    const priceUpdates = {};
    const costUpdates = {};
    document.querySelectorAll('.price-adjust').forEach(input => {
        const pid = input.dataset.pid;
        const val = parseFloat(input.value);
        if (pid && !isNaN(val)) priceUpdates[pid] = val;
    });
    document.querySelectorAll('.cost-adjust').forEach(input => {
        const pid = input.dataset.pid;
        const val = parseFloat(input.value);
        if (pid && !isNaN(val)) costUpdates[pid] = val;
    });
    if (!Object.keys(priceUpdates).length && !Object.keys(costUpdates).length) {
        showToast('No prices to update', 'error'); return;
    }
    try {
        const res = await api('POST', '/products/price-update', { price_updates: priceUpdates, cost_updates: costUpdates });
        if (res && res.success) {
            showToast('Prices updated!', 'success');
            loadPriceConfigurator();
        } else {
            showToast(res?.error || 'Failed to update prices (server returned: ' + JSON.stringify(res).slice(0,100) + ')', 'error');
        }
    } catch(e) {
        showToast('Price update error: ' + e.message, 'error');
    }
}

function filterPriceConfigurator() {
    const q = document.getElementById('price-search-input')?.value.toLowerCase().trim() || '';
    document.querySelectorAll('#tbl-price-configurator tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = !q || text.includes(q) ? '' : 'none';
    });
}

// ----- SUPPLIERS -----
async function loadSuppliersList(callback) {
    try {
        const res = await api('GET', '/suppliers');
        if (res.success) {
            const suppliers = res.suppliers || [];
            const datalist = document.getElementById('suppliers-list-datalist');
            if (datalist) datalist.innerHTML = suppliers.map(s => '<option value="' + s.name + '">').join('');
            const sel = document.getElementById('purchase-supplier');
            if (sel) sel.innerHTML = '<option value="">Select supplier...</option>' +
                suppliers.map(s => '<option value="' + s.supplier_id + '">' + s.name + '</option>').join('');
            if (callback) callback(suppliers);
        }
    } catch (e) {}
}

// ----- POS -----
async function loadPosView() {
    await loadPosProducts();
    setTimeout(() => document.getElementById('pos-barcode-scanner')?.focus(), 100);
}

async function loadPosProducts() {
    try {
        const res = await api('GET', '/products?_=' + Date.now());
        const prods = Array.isArray(res) ? res : (res.products || []);
        const grid = document.getElementById('pos-quick-grid');
        if (grid) {
            grid.innerHTML = prods.map(p =>
                '<button class="quick-item" onclick="promptAddToCart(' + p.product_id + ', \'' +
                p.title.replace(/'/g, "\\'") + '\', ' + (p.selling_price||0) + ', \'' +
                (p.sku_barcode||'') + '\')"><strong>' + p.title + '</strong><span class="quick-price">' +
                formatCurrency(p.selling_price||0) + '</span><span class="quick-cost">Cost: ' +
                formatCurrency(p.cost_price||0) + '</span></button>'
            ).join('');
        }
        // Also populate product select
        const sel = document.getElementById('pos-product-select');
        if (sel) {
            sel.innerHTML = '<option value="">Select product...</option>' +
                prods.map(p => '<option value="' + p.product_id + '" data-price="' + p.selling_price + '">' +
                p.title + ' - ' + formatCurrency(p.selling_price) + '</option>').join('');
        }
        lucideRefresh();
    } catch (e) { showToast('Failed to load products', 'error'); }
}

function handleBarcodeScan(e) {
    if (e.key === 'Enter') {
        const input = document.getElementById('pos-barcode-scanner');
        const barcode = input.value.trim();
        if (!barcode) return;
        input.value = '';
        lookupAndAddToCart(barcode);
    }
}

async function lookupAndAddToCart(barcode) {
    try {
        const res = await api('GET', '/barcode/lookup?code=' + encodeURIComponent(barcode));
        if (res.success) {
            promptAddToCart(res.product_id, res.title, res.selling_price, barcode);
        } else {
            showToast('Product not found: ' + barcode, 'error');
        }
    } catch (e) {
        showToast('Barcode lookup failed', 'error');
    }
}

function addToCart(id, title, price, barcode, qty) {
    qty = parseFloat(qty) || 1;
    const idx = posCart.findIndex(i => i.id === id);
    if (idx >= 0) { posCart[idx].qty += qty; }
    else { posCart.push({ id, title, price, barcode, qty }); }
    renderCart();
    showToast('Added: ' + (qty > 1 ? qty + ' KG ' : '') + title, 'success');
}

function promptAddToCart(id, title, price, barcode) {
    document.getElementById('qty-prompt-id').value = id;
    document.getElementById('qty-prompt-title').textContent = title;
    document.getElementById('qty-prompt-price').textContent = formatCurrency(price);
    document.getElementById('qty-prompt-value').value = '1';
    document.getElementById('qty-prompt-total').textContent = formatCurrency(price);
    document.getElementById('qty-prompt-unit').textContent = 'KG';
    document.getElementById('qty-prompt-modal').style.display = 'flex';
    document.getElementById('qty-prompt-value').focus();
    document.getElementById('qty-prompt-value').select();
}
function confirmQtyPrompt() {
    const id = parseInt(document.getElementById('qty-prompt-id').value);
    const title = document.getElementById('qty-prompt-title').textContent;
    const price = parseFloat(document.getElementById('qty-prompt-price').textContent.replace(/[^0-9.]/g, ''));
    const qty = parseFloat(document.getElementById('qty-prompt-value').value) || 1;
    if (qty <= 0) { showToast('Weight must be positive', 'error'); return; }
    addToCart(id, title, price, '', qty);
    document.getElementById('qty-prompt-modal').style.display = 'none';
}
function updateQtyPromptTotal() {
    const price = parseFloat(document.getElementById('qty-prompt-price').textContent.replace(/[^0-9.]/g, ''));
    const qty = parseFloat(document.getElementById('qty-prompt-value').value) || 1;
    document.getElementById('qty-prompt-total').textContent = formatCurrency(price * qty);
}

function removeCartItem(index) { posCart.splice(index, 1); renderCart(); }

function updateCartItemQty(index, qty) {
    const val = parseFloat(qty) || 1;
    if (val <= 0) { removeCartItem(index); return; }
    posCart[index].qty = val;
    const subtotal = posCart.reduce((s, i) => s + i.qty * i.price, 0);
    const totalQty = posCart.reduce((s, i) => s + i.qty, 0);
    const row = document.getElementById('cart-rows').children[index];
    if (row) row.querySelector('td:nth-child(5)').textContent = formatCurrency(val * posCart[index].price);
    const el = document.getElementById('lbl-cart-items-count');
    if (el) el.textContent = totalQty;
    const el2 = document.getElementById('lbl-cart-total-payable');
    if (el2) el2.textContent = formatCurrency(subtotal);
}

function clearCart() { posCart = []; renderCart(); showToast('Cart cleared', 'info'); }

function renderCart() {
    const tbody = document.getElementById('cart-rows');
    const countEl = document.getElementById('lbl-cart-items-count');
    const totalEl = document.getElementById('lbl-cart-total-payable');
    if (!tbody) return;
    let total = 0;
    if (posCart.length) {
        tbody.innerHTML = posCart.map((item, i) => {
            const lt = item.qty * item.price;
            total += lt;
            return '<tr><td>' + item.title + '</td><td>' + (item.barcode||'\u2014') + '</td><td>' +
                formatCurrency(item.price) + '</td><td><input type="number" value="' + item.qty +
                '" min="1" step="0.01" style="width:70px;" onchange="updateCartItemQty(' + i + ', this.value)"></td><td>' +
                formatCurrency(lt) + '</td><td><button class="clear-btn" onclick="removeCartItem(' + i +
                ')"><i data-lucide="x"></i></button></td></tr>';
        }).join('');
    } else {
        tbody.innerHTML = '<tr class="empty-cart-row"><td colspan="6">No items scanned or appended to sale registry.</td></tr>';
    }
    if (countEl) countEl.textContent = posCart.reduce((s, i) => s + i.qty, 0);
    if (totalEl) totalEl.textContent = formatCurrency(total);
    lucideRefresh();
}

async function executeCheckoutSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!posCart.length) { showToast('Cart is empty', 'error'); return; }
    if (!authToken) { showToast('Please login first', 'error'); return; }
    const items = posCart.map(i => ({ product_id: i.id, qty: i.qty, price: i.price }));
    try {
        const res = await api('POST', '/sales/checkout', { items });
        if (res.success) {
            showToast('Sale completed! Invoice #' + (res.invoice_id || res.transaction_id || ''), 'success');
            const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
            showReceiptModal({ invoice_id: res.invoice_id || res.transaction_id, items: [...posCart], total: subtotal, subtotal });
            clearCart();
        } else {
            showToast(res.error || 'Checkout failed', 'error');
        }
    } catch (e) { showToast('Checkout error: ' + e.message, 'error'); }
}

function showReceiptModal(data) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const total = data.total || 0;
    const vatRate = COMPANY.vat_rate;
    const discount = data.discount || 0;
    const subtotal = data.subtotal || total;
    const vat = data.vat != null ? data.vat : (subtotal - discount) * vatRate / 100;
    const paid = data.paid || total;
    const change = data.change || Math.max(0, paid - total);
    const cashier = data.cashier || authUser || 'Admin';
    const paymentMethod = data.payment_method || 'Cash';
    const invoiceId = COMPANY.invoice_prefix + (data.invoice_id || String(Date.now()).slice(-6));

    // Company info
    const logoEl = document.getElementById('receipt-logo-placeholder');
    if (logoEl) logoEl.textContent = COMPANY.receipt_logo;
    setText('receipt-company-name', COMPANY.name);
    setText('receipt-tagline', COMPANY.tagline);
    setText('receipt-address', COMPANY.address + '\n' + COMPANY.city);
    setText('receipt-contact', 'Phone: ' + COMPANY.phone + '\nEmail: ' + COMPANY.email + '\nVAT Reg: ' + COMPANY.vat_reg);

    // Bill info
    setText('receipt-invoice-id', invoiceId);
    setText('receipt-date', dateStr);
    setText('receipt-time', timeStr);
    setText('receipt-cashier', cashier);
    setText('receipt-branch', COMPANY.branch);

    // Items
    const tbody = document.querySelector('#tbl-receipt-items tbody');
    if (tbody && data.items) {
        tbody.innerHTML = data.items.map(i =>
            '<tr><td>' + (i.title || 'Item') + '</td><td>' + i.qty + '</td><td>' +
            formatCurrency(i.price) + '</td><td>' +
            formatCurrency(i.qty * i.price) + '</td></tr>'
        ).join('');
    }

    // Summary
    setText('receipt-subtotal', formatCurrency(subtotal));
    setText('receipt-discount', formatCurrency(discount));
    setText('receipt-vat', formatCurrency(vat));
    setText('receipt-total-amount', formatCurrency(total));

    // Payment
    setText('receipt-payment-method', paymentMethod);
    setText('receipt-paid', formatCurrency(paid));
    setText('receipt-change', formatCurrency(change));

    // Footer
    setText('receipt-footer-text', COMPANY.footer_text);
    setText('receipt-website', COMPANY.website);
    setText('receipt-return-policy', COMPANY.return_policy);

    document.getElementById('receipt-modal').classList.remove('hidden');
    lucideRefresh();
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function hideReceiptModal() { document.getElementById('receipt-modal').classList.add('hidden'); }
function printReceipt() { window.print(); }

function updateScaleSimulatorValue() {
    const val = document.getElementById('range-scale-slider').value;
    document.getElementById('lbl-live-scale-weight').textContent = parseFloat(val).toFixed(3);
}

// ----- WASTAGE -----
async function loadWastageView() {
    await loadWastageProducts();
    await loadWastageHistory();
}

async function loadWastageProducts() {
    try {
        const res = await api('GET', '/products?_=' + Date.now());
        const prods = Array.isArray(res) ? res : (res.products || []);
        const sel = document.getElementById('wastage-product');
        if (sel) {
            sel.innerHTML = '<option value="">-- Select Product --</option>' +
                prods.map(p => '<option value="' + p.product_id + '" data-cost="' + (p.cost_price||0) +
                '" data-title="' + p.title + '">' + p.title + ' (' + (p.sku_barcode||'') + ')</option>').join('');
        }
    } catch (e) { showToast('Failed to load products', 'error'); }
}

function updateWastageCalculation() {
    const sel = document.getElementById('wastage-product');
    const qty = parseFloat(document.getElementById('wastage-qty').value) || 0;
    const opt = sel?.options[sel.selectedIndex];
    const cost = parseFloat(opt?.dataset?.cost || 0);
    const lossEl = document.getElementById('lbl-wastage-loss-total');
    if (lossEl) lossEl.textContent = formatCurrency(qty * cost);
    const macEl = document.getElementById('lbl-wastage-mac');
    if (macEl) macEl.textContent = formatCurrency(cost);
}

async function submitWastageReport(e) {
    e.preventDefault();
    const sel = document.getElementById('wastage-product');
    const productId = parseInt(sel?.value);
    const qty = parseFloat(document.getElementById('wastage-qty').value) || 0;
    const reason = document.getElementById('wastage-reason').value.trim() || 'Spoilage/Damage';
    if (!productId || qty <= 0) { showToast('Select a product and enter quantity', 'error'); return; }
    const opt = sel.options[sel.selectedIndex];
    const costAtTime = parseFloat(opt?.dataset?.cost || 0);
    const lossAmount = qty * costAtTime;
    const res = await api('POST', '/wastage', { product_id: productId, qty, cost_at_time: costAtTime, loss_amount: lossAmount, reason });
    if (res.success) {
        showToast('Wastage logged successfully', 'success');
        document.getElementById('wastage-log-form').reset();
        const lossEl = document.getElementById('lbl-wastage-loss-total');
        if (lossEl) lossEl.textContent = formatCurrency(0);
        const macEl = document.getElementById('lbl-wastage-mac');
        if (macEl) macEl.textContent = formatCurrency(0);
        await loadWastageHistory();
    } else {
        showToast(res.error || 'Failed to log wastage', 'error');
    }
}

async function loadWastageHistory() {
    try {
        const fin = await api('GET', '/financials');
        const tbody = document.querySelector('#tbl-wastage-history tbody');
        if (!tbody) return;
        if (fin.wastage_history && fin.wastage_history.length) {
            tbody.innerHTML = fin.wastage_history.map(w =>
                '<tr><td>' + (w.timestamp||'') + '</td><td>' + (w.product_title||'') + ' (' + (w.sku_barcode||'') + ')</td><td>' +
                w.qty + ' ' + (w.unit_of_measure||'') + '</td><td>' + formatCurrency(w.cost_at_time) + '</td><td>' +
                formatCurrency(w.loss_amount) + '</td><td>' + (w.reason||'') + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="6">No decay or stock write-off events have occurred.</td></tr>';
        }
        lucideRefresh();
    } catch (e) {}
}

// ----- SUPPLIERS VIEW -----
async function loadSuppliersView() {
    await loadSuppliersList();
    await loadSupplierLedger();
}

async function submitSupplierTransaction(e) {
    e.preventDefault();
    const supplierName = document.getElementById('billing-supplier-name').value.trim();
    const txType = document.getElementById('billing-tx-type').value;
    const amount = parseFloat(document.getElementById('billing-amount').value) || 0;
    const reference = document.getElementById('billing-ref').value.trim() || '';
    if (!supplierName || amount <= 0) { showToast('Supplier name and amount required', 'error'); return; }
    const ledgerAmount = txType === 'payment' ? -amount : amount;
    const res = await api('POST', '/supplier/transaction', {
        supplier_name: supplierName, transaction_type: txType, amount: ledgerAmount, reference
    });
    if (res && res.success) {
        showToast('Supplier transaction registered', 'success');
    } else {
        showToast(res?.error || 'Failed', 'error');
    }
    document.getElementById('supplier-billing-form').reset();
    loadSupplierLedger();
}

async function loadSupplierLedger() {
    try {
        const fin = await api('GET', '/financials');
        const tbody = document.querySelector('#tbl-supplier-ledger-transactions tbody');
        const apEl = document.getElementById('lbl-total-payable');
        if (apEl) apEl.textContent = formatCurrency(fin.accounts_payable || 0);

        // Load supplier ledger entries
        const ledgerRes = await api('GET', '/supplier/ledger');
        if (ledgerRes && ledgerRes.success && ledgerRes.ledger) {
            if (tbody) {
                tbody.innerHTML = ledgerRes.ledger.map(e =>
                    '<tr><td>' + (e.timestamp ? e.timestamp.slice(0,16) : '') + '</td><td>' + e.supplier_name +
                    '</td><td>' + e.transaction_type + '</td><td>' + formatCurrency(e.amount) + '</td><td>' +
                    (e.reference || '') + '</td></tr>'
                ).join('');
            }
        } else if (tbody) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="5">No vendor files loaded in ledger.</td></tr>';
        }
        lucideRefresh();
    } catch (e) {}
}

// ----- USER ACCOUNTS -----
async function loadUsers() {
    if (authRole !== 'admin' && authRole !== 'superadmin') {
        const denied = document.getElementById('user-management-denied');
        const card = document.getElementById('user-management-card');
        if (denied) denied.classList.remove('hidden');
        if (card) card.classList.add('hidden');
        return;
    }
    const denied = document.getElementById('user-management-denied');
    const card = document.getElementById('user-management-card');
    if (denied) denied.classList.add('hidden');
    if (card) card.classList.remove('hidden');
    try {
        const res = await api('GET', '/users');
        if (res.success) {
            document.querySelector('#tbl-users-management tbody').innerHTML = res.users.map(u =>
                '<tr><td>' + u.username + '</td><td>' + u.role + '</td><td>' + (u.created_at ? u.created_at.slice(0,10) : '') + '</td></tr>'
            ).join('');
        }
        lucideRefresh();
    } catch (e) { showToast('Failed to load users', 'error'); }
}

async function registerUserFromAccountsView(e) {
    e.preventDefault();
    if (authRole !== 'admin' && authRole !== 'superadmin') { showToast('Access denied', 'error'); return; }
    const username = document.getElementById('user-management-username').value.trim();
    const password = document.getElementById('user-management-password').value.trim();
    const role = document.getElementById('user-management-role').value;
    if (!username || !password) { showToast('Username and password required', 'error'); return; }
    const res = await api('POST', '/auth/register', { username, password, role });
    if (res.success) {
        showToast('User created!', 'success');
        document.getElementById('user-management-username').value = '';
        document.getElementById('user-management-password').value = '';
        loadUsers();
        loadDashboard();
    } else { showToast(res.error || 'Failed to create user', 'error'); }
}

// ----- BRANCHES -----
async function loadBranches() {
    const tbody = document.querySelector('#tbl-branches tbody');
    if (!tbody) return;
    try {
        const res = await api('GET', '/branches');
        if (res.success && res.branches.length) {
            tbody.innerHTML = res.branches.map(b =>
                '<tr><td>' + b.code + '</td><td>' + b.name + '</td><td>' + (b.created_at ? b.created_at.slice(0,10) : '') + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="3">No branches yet.</td></tr>';
        }
        lucideRefresh();
    } catch(e) { showToast('Failed to load branches', 'error'); }
}

async function createBranch(e) {
    e.preventDefault();
    const name = document.getElementById('branch-name').value.trim();
    const code = document.getElementById('branch-code').value.trim();
    if (!name || !code) { showToast('Name and code required', 'error'); return; }
    const res = await api('POST', '/branches', { name, code });
    if (res.success) {
        showToast('Branch created!', 'success');
        document.getElementById('branch-form').reset();
        loadBranches();
    } else showToast(res.error || 'Failed', 'error');
}

// ----- PURCHASES -----
async function loadPurchaseView() {
    await loadSuppliersList();
    await loadBranches();
    await loadPurchaseProducts();
    await loadPurchases();
}

async function loadPurchaseProducts() {
    try {
        const res = await api('GET', '/products');
        const prods = Array.isArray(res) ? res : (res.products || []);
        const opts = '<option value="">Select product...</option>' +
            prods.map(p => '<option value="' + p.product_id + '" data-price="' + p.selling_price + '">' +
            p.title + ' (' + (p.sku_barcode || 'N/A') + ')</option>').join('');
        document.querySelectorAll('.purchase-product').forEach(sel => { if (sel) sel.innerHTML = opts; });
    } catch(e) {}
}

function addPurchaseItemRow() {
    const container = document.getElementById('purchase-items-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'form-row purchase-item-row';
    row.innerHTML = '<select class="form-group flex-2 purchase-product"><option>Select product...</option></select>' +
        '<input type="number" class="form-group flex-1 purchase-qty" placeholder="Qty" min="0" step="0.01">' +
        '<input type="number" class="form-group flex-1 purchase-cost" placeholder="Unit Cost" min="0" step="0.01">' +
        '<button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(row);
    loadPurchaseProducts();
}

async function createPurchase(e) {
    e.preventDefault();
    const supplier_id = parseInt(document.getElementById('purchase-supplier')?.value);
    const branch_id = parseInt(document.getElementById('purchase-branch')?.value);
    const invoice_no = document.getElementById('purchase-invoice').value.trim();
    if (!supplier_id || !branch_id) { showToast('Supplier and branch required', 'error'); return; }
    const items = [];
    document.querySelectorAll('.purchase-item-row').forEach(row => {
        const pid = parseInt(row.querySelector('.purchase-product')?.value);
        const qty = parseFloat(row.querySelector('.purchase-qty')?.value || 0);
        const cost = parseFloat(row.querySelector('.purchase-cost')?.value || 0);
        if (pid && qty > 0) items.push({ product_id: pid, qty, unit_cost: cost });
    });
    if (!items.length) { showToast('Add at least one item', 'error'); return; }
    const res = await api('POST', '/purchases', { supplier_id, branch_id, invoice_no, items });
    if (res.success) {
        showToast('Purchase order created!', 'success');
        document.getElementById('purchase-form').reset();
        loadPurchases();
    } else showToast(res.error || 'Failed', 'error');
}

async function loadPurchases() {
    const tbody = document.querySelector('#tbl-purchases tbody');
    if (!tbody) return;
    try {
        const res = await api('GET', '/purchases');
        if (res.success && res.purchases.length) {
            tbody.innerHTML = res.purchases.map(p =>
                '<tr><td>' + (p.created_at ? p.created_at.slice(0,10) : '') + '</td><td>' + p.supplier_name +
                '</td><td>' + p.branch_name + '</td><td>' + p.invoice_no + '</td><td>' +
                formatCurrency(p.total_amount) + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="5">No purchases yet.</td></tr>';
        }
    } catch(e) {}
    lucideRefresh();
}

// ----- SALES -----
async function loadSales() {
    const tbody = document.querySelector('#tbl-sales tbody');
    if (!tbody) return;
    try {
        const res = await api('GET', '/sales');
        if (res.success && res.sales.length) {
            tbody.innerHTML = res.sales.map(s =>
                '<tr><td>#' + s.sale_id + '</td><td>' + (s.created_at ? s.created_at.slice(0,16) : '') +
                '</td><td>' + s.branch_name + '</td><td>' + (s.cashier || '') + '</td><td>' +
                (s.customer_name || '-') + '</td><td>' + formatCurrency(s.total_amount) + '</td><td>' +
                s.payment_status + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="7">No sales yet.</td></tr>';
        }
    } catch(e) {}
    lucideRefresh();
}

async function loadSaleDetail() {
    const sid = document.getElementById('sale-detail-id')?.value;
    const resultDiv = document.getElementById('sale-detail-result');
    if (!sid || !resultDiv) { showToast('Enter a sale ID', 'error'); return; }
    try {
        const res = await api('GET', '/sales/' + sid);
        if (res.success) {
            const s = res.sale;
            let html = '<div style="background:var(--bg-input);padding:1rem;border-radius:var(--radius-sm);margin-top:1rem;">';
            html += '<p><strong>Invoice #' + s.sale_id + '</strong> | ' + s.created_at + '</p>';
            html += '<p>Branch: ' + s.branch_name + ' | Cashier: ' + (s.cashier || '') + ' | Customer: ' + (s.customer_name || '-') + '</p>';
            html += '<p>Total: ' + formatCurrency(s.total_amount) + ' | Status: ' + s.payment_status + '</p>';
            if (s.items && s.items.length) {
                html += '<table style="width:100%;margin-top:0.5rem;"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Line Total</th></tr></thead><tbody>';
                html += s.items.map(i => '<tr><td>' + i.product_title + '</td><td>' + i.qty + '</td><td>' + formatCurrency(i.unit_price) + '</td><td>' + formatCurrency(i.line_total) + '</td></tr>').join('');
                html += '</tbody></table>';
            }
            html += '</div>';
            resultDiv.innerHTML = html;
        } else {
            resultDiv.innerHTML = '<p style="color:var(--danger);">Sale not found.</p>';
        }
    } catch(e) { resultDiv.innerHTML = '<p style="color:var(--danger);">Error loading sale.</p>'; }
    lucideRefresh();
}

// ----- CUSTOMERS & LOYALTY -----
async function loadCustomersView() {
    await loadCustomers();
    await loadLoyaltyTiers();
}

async function loadCustomers() {
    const tbody = document.querySelector('#tbl-customers tbody');
    if (!tbody) return;
    try {
        const res = await api('GET', '/customers');
        if (res.success && res.customers.length) {
            tbody.innerHTML = res.customers.map(c =>
                '<tr><td>' + c.name + '</td><td>' + (c.phone || '') + '</td><td>' + (c.email || '') +
                '</td><td>' + (c.loyalty_id || '-') + '</td><td>' + (c.loyalty_points || 0) + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="5">No customers.</td></tr>';
        }
    } catch(e) {}
    lucideRefresh();
}

async function createCustomer(e) {
    e.preventDefault();
    const name = document.getElementById('customer-name').value.trim();
    if (!name) { showToast('Name required', 'error'); return; }
    const res = await api('POST', '/customers', { name, phone: document.getElementById('customer-phone')?.value, email: document.getElementById('customer-email')?.value });
    if (res.success) {
        showToast('Customer registered!', 'success');
        document.getElementById('customer-form').reset();
        loadCustomers();
    } else showToast(res.error || 'Failed', 'error');
}

async function loadLoyaltyTiers() {
    const el = document.getElementById('loyalty-tiers-list');
    if (!el) return;
    try {
        const res = await api('GET', '/loyalty/tiers');
        if (res.success && res.tiers.length) {
            el.innerHTML = '<table><thead><tr><th>Tier</th><th>Min Spend</th><th>Discount %</th></tr></thead><tbody>' +
                res.tiers.map(t => '<tr><td>' + t.name + '</td><td>' + formatCurrency(t.min_spend) + '</td><td>' + t.discount_pct + '%</td></tr>').join('') + '</tbody></table>';
        } else el.innerHTML = '<p style="color:var(--text-muted);">No loyalty tiers configured.</p>';
    } catch(e) {}
}

async function createLoyaltyTier(e) {
    e.preventDefault();
    const name = document.getElementById('tier-name').value.trim();
    if (!name) { showToast('Tier name required', 'error'); return; }
    const res = await api('POST', '/loyalty/tiers', {
        name, min_spend: parseFloat(document.getElementById('tier-min-spend')?.value || 0),
        discount_pct: parseFloat(document.getElementById('tier-discount')?.value || 0)
    });
    if (res.success) {
        showToast('Tier created!', 'success');
        document.getElementById('loyalty-tier-form').reset();
        loadLoyaltyTiers();
    } else showToast(res.error || 'Failed', 'error');
}

// ----- VAT -----
async function loadVatRates() {
    const listEl = document.getElementById('vat-rates-list');
    const selectEl = document.getElementById('vat-calc-rate');
    try {
        const res = await api('GET', '/vat/rates');
        if (res.success && res.rates.length) {
            if (listEl) {
                listEl.innerHTML = res.rates.map(r =>
                    '<div style="padding:0.5rem 0;border-bottom:1px solid var(--border);">' + r.name + ': <strong>' + r.percentage + '%</strong></div>'
                ).join('');
            }
            if (selectEl) {
                selectEl.innerHTML = '<option value="">Select rate...</option>' +
                    res.rates.map(r => '<option value="' + r.rate_id + '">' + r.name + ' (' + r.percentage + '%)</option>').join('');
            }
        }
    } catch(e) {}
}

async function createVatRate(e) {
    e.preventDefault();
    const name = document.getElementById('vat-rate-name').value.trim();
    const pct = parseFloat(document.getElementById('vat-rate-pct').value || 0);
    if (!name || pct <= 0) { showToast('Valid name and percentage required', 'error'); return; }
    const res = await api('POST', '/vat/rates', { name, percentage: pct });
    if (res.success) {
        showToast('VAT rate added!', 'success');
        document.getElementById('vat-rate-form').reset();
        loadVatRates();
    } else showToast(res.error || 'Failed', 'error');
}

async function calculateVat() {
    const amount = parseFloat(document.getElementById('vat-calc-amount')?.value || 0);
    const rateId = document.getElementById('vat-calc-rate')?.value;
    const resultDiv = document.getElementById('vat-result');
    if (!amount || !rateId) { showToast('Enter amount and select rate', 'error'); return; }
    try {
        const res = await api('POST', '/vat/calculate', { amount, vat_rate_id: parseInt(rateId) });
        if (res.success) {
            resultDiv.innerHTML = '<div>VAT Rate: <strong>' + res.vat_rate + '%</strong></div>' +
                '<div>VAT Amount: <strong>' + formatCurrency(res.vat_amount) + '</strong></div>' +
                '<div style="font-size:1.2rem;font-weight:700;margin-top:0.5rem;color:var(--primary-light);">Total with VAT: ' + formatCurrency(res.total_with_vat) + '</div>';
        }
    } catch(e) { resultDiv.innerHTML = '<p style="color:var(--danger);">Calculation error.</p>'; }
}

// ----- BARCODE SCANNER -----
async function lookupBarcode() {
    const code = document.getElementById('barcode-input')?.value.trim();
    const resultDiv = document.getElementById('barcode-result');
    if (!code) { showToast('Enter or scan a barcode', 'error'); return; }
    try {
        const res = await api('GET', '/barcode/lookup?code=' + encodeURIComponent(code));
        if (res.success) {
            resultDiv.innerHTML = '<div style="background:var(--bg-input);padding:1rem;border-radius:var(--radius-sm);">' +
                '<h4 style="color:var(--success);">' + res.title + '</h4>' +
                '<p>Product ID: ' + res.product_id + ' | SKU: ' + res.sku_barcode + '</p>' +
                '<p>Price: ' + formatCurrency(res.selling_price) + '</p>' +
                '<p>Stock: ' + res.current_stock + ' ' + (res.unit_of_measure || 'pcs') + '</p>' +
                '</div>';
        } else {
            resultDiv.innerHTML = '<p style="color:var(--danger);">Product not found for barcode: ' + code + '</p>';
        }
    } catch(e) { resultDiv.innerHTML = '<p style="color:var(--danger);">Lookup error.</p>'; }
    lucideRefresh();
}

// ----- ANALYTICS -----
async function loadAnalytics() {
    const period = document.getElementById('analytics-period')?.value || 'month';
    try {
        const res = await api('GET', '/analytics?period=' + period);
        if (!res.success) return;

        const overviewEl = document.getElementById('analytics-overview');
        if (overviewEl && res.timeline && res.timeline.length) {
            const totalRev = res.timeline.reduce((s, d) => s + d.revenue, 0);
            const totalProfit = res.timeline.reduce((s, d) => s + d.profit, 0);
            const margin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0;
            overviewEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">' +
                '<div style="background:var(--bg-input);padding:1rem;border-radius:var(--radius-sm);text-align:center;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:var(--success);">' + formatCurrency(totalRev) + '</div>' +
                '<div style="font-size:0.8rem;color:var(--text-muted);">Total Revenue</div></div>' +
                '<div style="background:var(--bg-input);padding:1rem;border-radius:var(--radius-sm);text-align:center;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:var(--primary-light);">' + formatCurrency(totalProfit) + '</div>' +
                '<div style="font-size:0.8rem;color:var(--text-muted);">Gross Profit</div></div>' +
                '<div style="background:var(--bg-input);padding:1rem;border-radius:var(--radius-sm);text-align:center;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:' + (margin > 0 ? 'var(--success)' : 'var(--danger)') + ';">' + margin + '%</div>' +
                '<div style="font-size:0.8rem;color:var(--text-muted);">Profit Margin</div></div></div>';
        } else if (overviewEl) {
            overviewEl.innerHTML = '<p style="color:var(--text-muted);">No data for selected period.</p>';
        }

        const catEl = document.getElementById('analytics-categories');
        if (catEl && res.category_breakdown && res.category_breakdown.length) {
            catEl.innerHTML = '<div style="margin-top:0.5rem;">' +
                res.category_breakdown.map(c =>
                    '<div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--border);">' +
                    '<span>' + c.category + '</span><span style="font-weight:600;">' + formatCurrency(c.total) + '</span></div>'
                ).join('') + '</div>';
        } else if (catEl) catEl.innerHTML = '<p style="color:var(--text-muted);">No category data.</p>';

        const brEl = document.getElementById('analytics-branches');
        if (brEl && res.branch_breakdown && res.branch_breakdown.length) {
            brEl.innerHTML = '<div style="margin-top:0.5rem;">' +
                res.branch_breakdown.map(b =>
                    '<div style="display:flex;justify-content:space-between;padding:0.3rem 0;border-bottom:1px solid var(--border);">' +
                    '<span>' + b.branch + '</span><span style="font-weight:600;">' + formatCurrency(b.total) + '</span></div>'
                ).join('') + '</div>';
        } else if (brEl) brEl.innerHTML = '<p style="color:var(--text-muted);">No branch data.</p>';
    } catch(e) { showToast('Failed to load analytics', 'error'); }
    lucideRefresh();
}

// ----- INVENTORY FULL VIEW (from sidebar "Inventory" nav item) -----
async function loadInventoryFull() {
    try {
        const res = await api('GET', '/inventory');
        if (res.success && res.inventory) {
            const tbody = document.querySelector('#tbl-inventory tbody');
            if (tbody) {
                tbody.innerHTML = res.inventory.map(i =>
                    '<tr><td>' + (i.product_sku || '') + '</td><td>' + i.product_title + '</td><td>' +
                    i.branch_name + '</td><td>' + i.current_stock + '</td><td>' +
                    formatCurrency(i.last_cost) + '</td><td>' + formatCurrency(i.current_stock * i.last_cost) + '</td></tr>'
                ).join('');
            }
        }
    } catch(e) {}
    lucideRefresh();
}

// ----- REGISTER USER (from dashboard user-accounts-card) -----
async function registerUser(e) {
    e.preventDefault();
    if (authRole !== 'admin' && authRole !== 'superadmin') { showToast('Access denied', 'error'); return; }
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value.trim();
    const role = document.getElementById('new-role').value;
    if (!username || !password) { showToast('Username and password required', 'error'); return; }
    const res = await api('POST', '/auth/register', { username, password, role });
    if (res.success) {
        showToast('User created!', 'success');
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
        loadDashboard();
    } else { showToast(res.error || 'Failed to create user', 'error'); }
}

// ----- EXPENSES (basic support) -----
async function loadExpenses() {
    try {
        const res = await api('GET', '/expenses');
        const tbody = document.querySelector('#tbl-expenses tbody');
        if (res.success && tbody) {
            tbody.innerHTML = res.expenses.map(e =>
                '<tr><td>' + (e.created_at ? e.created_at.slice(0,10) : '') + '</td><td>' + e.category +
                '</td><td>' + formatCurrency(e.amount) + '</td><td>' + (e.note || '') + '</td></tr>'
            ).join('');
        }
    } catch(e) {}
}

async function createExpense(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('expense-amount')?.value || 0);
    const category = document.getElementById('expense-category')?.value || 'general';
    const note = document.getElementById('expense-note')?.value || '';
    if (amount <= 0) { showToast('Amount must be positive', 'error'); return; }
    const res = await api('POST', '/expenses', { amount, category, note });
    if (res.success) {
        showToast('Expense recorded!', 'success');
        document.getElementById('expense-form').reset();
        loadExpenses();
    } else showToast(res.error || 'Failed', 'error');
}

// ----- CHANGE USERNAME & PASSWORD -----
function showChangePassword() {
    document.getElementById('change-pw-modal').style.display = 'flex';
    document.getElementById('chgusr-current').value = authUser || '';
    document.getElementById('chgusr-new').value = '';
    document.getElementById('chgusr-pw').value = '';
    document.getElementById('chgpw-current').value = '';
    document.getElementById('chgpw-new').value = '';
    document.getElementById('chgpw-confirm').value = '';
    document.getElementById('chgpw-error').className = 'error-msg';
    document.getElementById('chgpw-error').innerText = '';
}

async function submitChangeUsername() {
    const new_username = document.getElementById('chgusr-new').value.trim();
    const password = document.getElementById('chgusr-pw').value;
    const errEl = document.getElementById('chgpw-error');
    if (!new_username) { errEl.innerText = 'Enter a new username'; errEl.classList.add('show'); return; }
    if (new_username.length < 3) { errEl.innerText = 'Username must be at least 3 characters'; errEl.classList.add('show'); return; }
    if (!password) { errEl.innerText = 'Enter your password to confirm'; errEl.classList.add('show'); return; }
    errEl.className = 'error-msg';
    errEl.innerText = '';
    try {
        const res = await api('POST', '/auth/change-username', { new_username, password });
        if (res.success) {
            authUser = new_username;
            localStorage.setItem('erp_username', new_username);
            showToast(res.message || 'Username updated!', 'success');
            updateAuthUI();
            document.getElementById('chgusr-new').value = '';
            document.getElementById('chgusr-pw').value = '';
        } else {
            errEl.innerText = res.error || 'Failed to update username';
            errEl.classList.add('show');
        }
    } catch (err) {
        errEl.innerText = 'ERROR: ' + (err.message || err);
        errEl.classList.add('show');
    }
}
function hideChangePassword() {
    document.getElementById('change-pw-modal').style.display = 'none';
}
async function submitChangePassword() {
    const current = document.getElementById('chgpw-current').value;
    const newPw = document.getElementById('chgpw-new').value;
    const confirm = document.getElementById('chgpw-confirm').value;
    const errEl = document.getElementById('chgpw-error');
    if (!current || !newPw || !confirm) { errEl.innerText = 'Fill all fields'; errEl.classList.add('show'); return; }
    if (newPw !== confirm) { errEl.innerText = 'New passwords do not match'; errEl.classList.add('show'); return; }
    if (newPw.length < 4) { errEl.innerText = 'New password must be at least 4 characters'; errEl.classList.add('show'); return; }
    errEl.className = 'error-msg';
    errEl.innerText = '';
    try {
        const res = await api('POST', '/auth/change-password', { current_password: current, new_password: newPw });
        if (res.success) {
            showToast('Password updated successfully!', 'success');
            hideChangePassword();
        } else {
            errEl.innerText = res.error || 'Failed to update password';
            errEl.classList.add('show');
        }
    } catch (err) {
        errEl.innerText = 'ERROR: ' + (err.message || err);
        errEl.classList.add('show');
    }
}

// ============= THEME TOGGLE =============
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    const isDark = body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        body.removeAttribute('data-theme');
        if (icon) icon.setAttribute('data-lucide', 'moon');
    } else {
        body.setAttribute('data-theme', 'dark');
        if (icon) icon.setAttribute('data-lucide', 'sun');
    }
    localStorage.setItem('erp_theme', isDark ? 'light' : 'dark');
    lucideRefresh();
}

function applySavedTheme() {
    const saved = localStorage.getItem('erp_theme');
    if (saved === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.setAttribute('data-lucide', 'sun');
    }
}

// ============= USER DROPDOWN =============
function showMyProfile() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.remove('show');
    const name = authUser || '—';
    const role = authRole || '—';
    showToast(`Logged in as ${name} (${role})`, 'info');
}
function toggleUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.toggle('show');
}
document.addEventListener('click', function(e) {
    const container = document.getElementById('user-dropdown-container');
    const menu = document.getElementById('user-dropdown-menu');
    if (container && menu && !container.contains(e.target)) {
        menu.classList.remove('show');
    }
});

// ============= GLOBAL SEARCH =============
let searchDebounce = null;
async function globalSearchLive() {
    clearTimeout(searchDebounce);
    const dd = document.getElementById('search-dropdown');
    const q = document.getElementById('global-search')?.value.trim();
    if (!q) { if (dd) dd.classList.remove('show'); return; }
    searchDebounce = setTimeout(async () => {
        try {
            const res = await api('GET', '/products?_=' + Date.now());
            const prods = Array.isArray(res) ? res : (res.products || []);
            const prodMatches = prods.filter(p =>
                (p.title||'').toLowerCase().includes(q.toLowerCase()) ||
                (p.sku_barcode||'').toLowerCase().includes(q.toLowerCase())
            );
            const salesRes = await api('GET', '/sales');
            const saleMatches = (salesRes.success && salesRes.sales) ? salesRes.sales.filter(s =>
                s.sale_id == q || (s.customer_name||'').toLowerCase().includes(q.toLowerCase())
            ) : [];
            let html = '';
            if (prodMatches.length) {
                html += '<div class="search-category">Products</div>';
                prodMatches.slice(0, 5).forEach(p => {
                    html += `<div class="search-item" onclick="switchView('view-inventory');document.getElementById('search-dropdown').classList.remove('show')"><i data-lucide="package"></i> ${p.title} <span class="search-badge">${formatCurrency(p.sale_price||0)}</span></div>`;
                });
            }
            if (saleMatches.length) {
                html += '<div class="search-category">Sales</div>';
                saleMatches.slice(0, 5).forEach(s => {
                    html += `<div class="search-item" onclick="switchView('view-sales');document.getElementById('sale-detail-id').value=${s.sale_id};loadSaleDetail();document.getElementById('search-dropdown').classList.remove('show')"><i data-lucide="receipt"></i> Sale #${s.sale_id} - ${s.customer_name||'Walk-in'} <span class="search-badge">${formatCurrency(s.total_amount)}</span></div>`;
                });
            }
            if (!html) {
                html = '<div class="search-empty">No results found</div>';
            }
            if (dd) { dd.innerHTML = html; dd.classList.add('show'); lucideRefresh(); }
        } catch(e) { /* ignore */ }
    }, 300);
}
async function globalSearch() {
    const dd = document.getElementById('search-dropdown');
    if (dd) dd.classList.remove('show');
    const q = document.getElementById('global-search')?.value.trim();
    if (!q) { showToast('Enter a search term', 'info'); return; }
    try {
        const res = await api('GET', '/products?_=' + Date.now());
        const prods = Array.isArray(res) ? res : (res.products || []);
        const matches = prods.filter(p =>
            (p.title||'').toLowerCase().includes(q.toLowerCase()) ||
            (p.sku_barcode||'').toLowerCase().includes(q.toLowerCase())
        );
        if (matches.length) {
            showToast('Found ' + matches.length + ' product(s)', 'success');
            switchView('view-inventory');
            const searchInput = document.getElementById('inventory-search');
            if (searchInput) { searchInput.value = q; loadInventoryTable(); }
        } else {
            const salesRes = await api('GET', '/sales');
            if (salesRes.success && salesRes.sales.length) {
                const saleMatch = salesRes.sales.find(s => s.sale_id == q || (s.customer_name||'').toLowerCase().includes(q.toLowerCase()));
                if (saleMatch) {
                    showToast('Sale #' + saleMatch.sale_id + ' found', 'success');
                    switchView('view-sales');
                    const sidInput = document.getElementById('sale-detail-id');
                    if (sidInput) { sidInput.value = saleMatch.sale_id; loadSaleDetail(); }
                    return;
                }
            }
            showToast('No results found for "' + q + '"', 'info');
        }
    } catch(e) { showToast('Search error', 'error'); }
}

// ============= BREADCRUMB =============
const viewLabels = {
    'view-dashboard': 'Dashboard', 'view-pos': 'POS', 'view-products': 'Products',
    'view-inventory': 'Inventory', 'view-stock-transfer': 'Stock Transfer',
    'view-stock-audit': 'Stock Audit', 'view-purchases': 'Purchases',
    'view-purchase-returns': 'Purchase Returns', 'view-grn': 'Goods Receive',
    'view-sales': 'Sales', 'view-sales-returns': 'Sales Returns',
    'view-customers': 'Customers', 'view-suppliers': 'Suppliers',
    'view-accounting': 'Accounting', 'view-vat': 'VAT',
    'view-wastage': 'Wastage', 'view-analytics': 'Analytics',
    'view-barcode': 'Barcode', 'view-reports': 'Reports',
    'view-audit-log': 'Security', 'view-settings': 'Settings',
    'view-branches': 'Branches', 'view-users': 'Users',
    'view-api-docs': 'API Docs'
};
function updateBreadcrumb(targetId) {
    const el = document.getElementById('bc-current');
    if (el) el.textContent = viewLabels[targetId] || 'Dashboard';
}

// ============= NOTIFICATIONS =============
let notificationCount = 0;
async function checkNotifications() {
    try {
        const dash = await api('GET', '/dashboard');
        if (dash.success) {
            const lowStock = dash.summary?.low_stock_alerts || 0;
            notificationCount = lowStock;
            const badge = document.getElementById('notif-badge');
            if (badge) {
                badge.textContent = lowStock;
                badge.style.display = lowStock > 0 ? 'flex' : 'none';
            }
        }
    } catch(e) {}
}

function showNotifications() {
    toggleNotifPanel();
}

// Toggle notification dropdown
function toggleNotifPanel() {
    const panel = document.getElementById('notif-dropdown');
    if (panel) {
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) loadNotifications();
        else closeAllDropdowns();
    }
}
document.addEventListener('click', function(e) {
    const container = document.getElementById('notif-container');
    const panel = document.getElementById('notif-dropdown');
    if (container && panel && !container.contains(e.target)) {
        panel.classList.remove('show');
    }
});

// Patch switchView to update breadcrumb
const origSwitchView = switchView;
switchView = function(targetId) {
    origSwitchView(targetId);
    updateBreadcrumb(targetId);
};

// Close all open dropdowns (notif, user)
function closeAllDropdowns() {
    document.getElementById('notif-dropdown')?.classList.remove('show');
    document.getElementById('user-dropdown-menu')?.classList.remove('show');
}

// ============= FULL DASHBOARD =============
async function loadFullDashboard() {
    try {
        const d = await api('GET', '/dashboard/full');
        if (d.success) {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            set('wd-today-sales', formatCurrency(d.today_sales));
            set('wd-week-sales', formatCurrency(d.week_sales));
            set('wd-month-sales', formatCurrency(d.month_sales));
            set('wd-year-sales', formatCurrency(d.year_sales));
            set('wd-today-expense', formatCurrency(d.today_expense));
            set('wd-month-expense', formatCurrency(d.month_expense));
            set('wd-profit', formatCurrency(d.profit));
            set('wd-inventory-value', formatCurrency(d.inventory_value));
            set('wd-cash-balance', formatCurrency(d.cash_balance));
            set('wd-bank-balance', formatCurrency(d.bank_balance));
            set('wd-vat-collected', formatCurrency(d.vat_collected));
            set('wd-customers', d.total_customers);
            set('wd-suppliers', d.total_suppliers);
            set('wd-branches', d.total_branches);
            set('wd-employees', d.total_employees);
            set('wd-products', d.total_products);
            set('wd-near-expiry', d.near_expiry);
            set('wd-low-stock', d.low_stock);
            set('wd-supplier-due', formatCurrency(d.supplier_due));

            const tpBody = document.getElementById('tbl-top-products');
            if (tpBody && d.top_products) {
                tpBody.innerHTML = d.top_products.map(p =>
                    `<tr><td>${p.title}</td><td>${p.total_qty}</td><td>${formatCurrency(p.total_revenue)}</td></tr>`
                ).join('');
            }

            renderDashCharts(d);
        }
    } catch(e) { showToast('Dashboard load error', 'error'); }
}

// ============= CHART OF ACCOUNTS =============
let accountHeadsCache = [];
async function loadAccountTree() {
    try {
        const res = await api('GET', '/account-heads/tree');
        if (res.success) {
            accountHeadsCache = flattenTree(res.tree);
            renderAccountTree(res.tree);
            populateHeadSelects();
        }
    } catch(e) { showToast('Failed to load accounts', 'error'); }
}

function flattenTree(nodes, depth = 0) {
    let result = [];
    nodes.forEach(n => {
        result.push({ ...n, depth });
        if (n.children) result = result.concat(flattenTree(n.children, depth + 1));
    });
    return result;
}

function renderAccountTree(tree) {
    const container = document.getElementById('account-tree');
    if (!container) return;
    function renderNode(nodes, level) {
        return nodes.map(n => `
            <div class="tree-node" style="padding-left:${level * 20}px">
                <span class="tree-type-badge type-${n.head_type?.toLowerCase()}">${n.head_type}</span>
                <span class="tree-name">${n.name}</span>
                <span class="tree-actions">
                    <button class="btn-small" onclick="editAccountHead(${n.head_id})">Edit</button>
                    <button class="btn-small btn-remove" onclick="deleteAccountHead(${n.head_id})">Del</button>
                </span>
            </div>
            ${n.children && n.children.length ? renderNode(n.children, level + 1) : ''}
        `).join('');
    }
    container.innerHTML = renderNode(tree, 0);
}

function populateHeadSelects() {
    const selects = ['voucher-head-select', 'journal-head-select', 'account-head-parent'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="">Select...</option>' +
            accountHeadsCache.map(h =>
                `<option value="${h.head_id}">${'—'.repeat(h.depth || 0)} ${h.name} (${h.head_type})</option>`
            ).join('');
    });
}

async function editAccountHead(hid) {
    const h = accountHeadsCache.find(x => x.head_id === hid);
    if (!h) { showToast('Not found', 'error'); return; }
    const name = prompt('Account Name:', h.name);
    if (!name) return;
    await api('PUT', '/account-heads/' + hid, { name });
    showToast('Account updated', 'success');
    loadAccountTree();
}

async function deleteAccountHead(hid) {
    if (!confirm('Delete this account head?')) return;
    const res = await api('DELETE', '/account-heads/' + hid);
    if (res.success) { showToast('Deleted', 'success'); loadAccountTree(); }
    else showToast(res.error || 'Cannot delete', 'error');
}

async function submitNewAccountHead(e) {
    e.preventDefault();
    const name = document.getElementById('new-head-name')?.value;
    const type = document.getElementById('new-head-type')?.value;
    const parent = document.getElementById('account-head-parent')?.value;
    if (!name || !type) { showToast('Name and type required', 'error'); return; }
    const res = await api('POST', '/account-heads', { name, head_type: type, parent_id: parent ? parseInt(parent) : null });
    if (res.success) {
        showToast('Account created', 'success');
        document.getElementById('new-head-name').value = '';
        loadAccountTree();
    } else showToast(res.error, 'error');
}

// ============= VOUCHERS =============
async function loadVouchers(type) {
    try {
        const res = await api('GET', '/vouchers?type=' + (type || ''));
        const tbody = document.querySelector('#tbl-vouchers tbody');
        if (!tbody) return;
        if (res.success && res.vouchers.length) {
            tbody.innerHTML = res.vouchers.map(v =>
                `<tr>
                    <td>${v.voucher_no}</td>
                    <td><span class="vtype-badge ${v.voucher_type}">${v.voucher_type}</span></td>
                    <td>${formatCurrency(v.amount)}</td>
                    <td>${v.description || '-'}</td>
                    <td>${v.date ? v.date.slice(0, 10) : '-'}</td>
                    <td><span class="status-badge ${v.status}">${v.status}</span></td>
                </tr>`
            ).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No vouchers found</td></tr>';
        }
    } catch(e) { showToast('Load error', 'error'); }
}

let voucherLineCount = 0;
function addVoucherLine() {
    const container = document.getElementById('voucher-lines');
    if (!container) return;
    voucherLineCount++;
    const div = document.createElement('div');
    div.className = 'form-row voucher-line';
    div.id = 'vl-' + voucherLineCount;
    div.innerHTML = `
        <select class="flex-2 voucher-head" required>
            <option value="">Account...</option>
            ${accountHeadsCache.map(h => `<option value="${h.head_id}">${h.name}</option>`).join('')}
        </select>
        <input type="number" class="flex-1 voucher-debit" placeholder="Debit" step="0.01" min="0">
        <input type="number" class="flex-1 voucher-credit" placeholder="Credit" step="0.01" min="0">
        <button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(div);
}

async function submitVoucher(e) {
    e.preventDefault();
    const vtype = document.getElementById('voucher-type')?.value;
    const desc = document.getElementById('voucher-desc')?.value;
    if (!vtype) { showToast('Select voucher type', 'error'); return; }
    const lines = [];
    document.querySelectorAll('.voucher-line').forEach(el => {
        const head_id = el.querySelector('.voucher-head')?.value;
        const debit = parseFloat(el.querySelector('.voucher-debit')?.value) || 0;
        const credit = parseFloat(el.querySelector('.voucher-credit')?.value) || 0;
        if (head_id) lines.push({ head_id: parseInt(head_id), debit, credit });
    });
    if (!lines.length) { showToast('Add at least one line', 'error'); return; }
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        showToast('Debit and credit must balance', 'error'); return;
    }
    try {
        const res = await api('POST', '/vouchers', { voucher_type: vtype, amount: totalDebit, description: desc, lines });
        if (res.success) {
            showToast('Voucher created: ' + res.voucher.voucher_no, 'success');
            document.getElementById('voucher-form')?.reset();
            document.getElementById('voucher-lines').innerHTML = '';
            loadVouchers(vtype);
        } else showToast(res.error, 'error');
    } catch(e) { showToast('Error creating voucher', 'error'); }
}

// ============= CASH BOOK / BANK BOOK =============
async function loadCashBook() {
    const tbody = document.querySelector('#tbl-cash-book tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Loading...</td></tr>';
    try {
        const res = await api('GET', '/reports/cash-book');
        if (res.success && res.rows.length) {
            let balance = 0;
            tbody.innerHTML = res.rows.map(r => {
                balance += r.debit - r.credit;
                return `<tr><td>${r.date?.slice(0,10)||'-'}</td><td>${r.description||'-'}</td>
                    <td>${formatCurrency(r.debit)}</td><td>${formatCurrency(r.credit)}</td>
                    <td><strong>${formatCurrency(balance)}</strong></td></tr>`;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No entries</td></tr>';
        }
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error loading</td></tr>'; }
}

async function loadBankBook() {
    const tbody = document.querySelector('#tbl-bank-book tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Loading...</td></tr>';
    try {
        const res = await api('GET', '/reports/bank-book');
        if (res.success && res.rows.length) {
            let balance = 0;
            tbody.innerHTML = res.rows.map(r => {
                balance += r.debit - r.credit;
                return `<tr><td>${r.date?.slice(0,10)||'-'}</td><td>${r.description||'-'}</td>
                    <td>${formatCurrency(r.debit)}</td><td>${formatCurrency(r.credit)}</td>
                    <td><strong>${formatCurrency(balance)}</strong></td></tr>`;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No entries</td></tr>';
        }
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error loading</td></tr>'; }
}

// ============= CASH FLOW =============
async function loadCashFlowReport() {
    const container = document.getElementById('cash-flow-content');
    if (!container) return;
    container.innerHTML = '<p class="chart-empty">Loading...</p>';
    try {
        const res = await api('GET', '/reports/cash-flow');
        if (res.success) {
            const oa = res.operating_activities || {};
            container.innerHTML = `
                <div class="report-table">
                    <h4>Operating Activities (${res.from_date} - ${res.to_date})</h4>
                    <div class="cf-row"><span>Sales Revenue</span><span class="cf-pos">${formatCurrency(oa.sales_revenue)}</span></div>
                    <div class="cf-row"><span>Purchases</span><span class="cf-neg">${formatCurrency(oa.purchases)}</span></div>
                    <div class="cf-row"><span>Expenses</span><span class="cf-neg">${formatCurrency(oa.expenses)}</span></div>
                    <div class="cf-row cf-total"><span>Net Operating Cash Flow</span>
                        <span class="${oa.net_operating >= 0 ? 'cf-pos' : 'cf-neg'}">${formatCurrency(oa.net_operating)}</span>
                    </div>
                </div>`;
        } else container.innerHTML = '<p class="chart-empty">No data</p>';
    } catch(e) { container.innerHTML = '<p class="chart-empty">Error</p>'; }
}

// ============= INCOME STATEMENT =============
async function loadIncomeStatement() {
    const container = document.getElementById('income-statement-content');
    if (!container) return;
    container.innerHTML = '<p class="chart-empty">Loading...</p>';
    try {
        const res = await api('GET', '/reports/income-statement');
        if (res.success) {
            const items = (res.income_by_head || []).map(h =>
                `<div class="cf-row"><span>${h.head}</span><span class="cf-pos">${formatCurrency(h.amount)}</span></div>`
            ).join('');
            container.innerHTML = `
                <div class="report-table">
                    <h4>Income Statement (${res.from_date} - ${res.to_date})</h4>
                    <div class="cf-row"><span>Revenue</span><span class="cf-pos">${formatCurrency(res.revenue)}</span></div>
                    <div class="cf-row"><span>COGS</span><span class="cf-neg">${formatCurrency(res.cogs)}</span></div>
                    <div class="cf-row cf-total"><span>Gross Profit</span><span class="cf-pos">${formatCurrency(res.gross_profit)}</span></div>
                    <div class="cf-row"><span>Expenses</span><span class="cf-neg">${formatCurrency(res.expenses)}</span></div>
                    ${items}
                    <div class="cf-row cf-total"><span>Net Profit</span>
                        <span class="${res.net_profit >= 0 ? 'cf-pos' : 'cf-neg'}">${formatCurrency(res.net_profit)}</span>
                    </div>
                </div>`;
        } else container.innerHTML = '<p class="chart-empty">No data</p>';
    } catch(e) { container.innerHTML = '<p class="chart-empty">Error</p>'; }
}

// ============= NOTIFICATIONS =============
async function loadNotifications() {
    try {
        const res = await api('GET', '/notifications');
        const list = document.getElementById('notif-list');
        if (!list) return;
        if (res.success && res.notifications.length) {
            list.innerHTML = res.notifications.map(n =>
                `<div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.notif_id})">
                    <div class="notif-icon notif-${n.type}"><i data-lucide="${getNotifIcon(n.type)}"></i></div>
                    <div class="notif-body">
                        <strong>${n.title}</strong>
                        <p>${n.message}</p>
                        <span class="notif-time">${timeAgo(n.created_at)}</span>
                    </div>
                </div>`
            ).join('');
            lucideRefresh();
        } else {
            list.innerHTML = '<div class="notif-empty">No notifications</div>';
        }
        updateNotifBadge();
    } catch(e) {}
}

function getNotifIcon(type) {
    const icons = { low_stock: 'alert-triangle', new_sale: 'shopping-cart', supplier_due: 'truck',
        backup: 'database', login_alert: 'log-in', password_changed: 'lock' };
    return icons[type] || 'bell';
}

async function updateNotifBadge() {
    try {
        const res = await api('GET', '/notifications/unread-count');
        const badge = document.getElementById('notif-badge');
        if (badge) {
            const count = res.unread || 0;
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch(e) {}
}

async function markNotifRead(nid) {
    await api('POST', '/notifications/read/' + nid);
    loadNotifications();
}

async function markAllNotifRead() {
    await api('POST', '/notifications/read-all');
    loadNotifications();
    showToast('All marked read', 'success');
}

function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    return days + 'd ago';
}

// ============= SYSTEM LOGS =============
async function loadSystemLogs(type) {
    try {
        const res = await api('GET', '/system-logs?type=' + (type || ''));
        const tbody = document.querySelector('#tbl-system-logs tbody');
        if (!tbody) return;
        if (res.success && res.logs.length) {
            tbody.innerHTML = res.logs.map(l =>
                `<tr>
                    <td><span class="log-type-badge ${l.log_type}">${l.log_type}</span></td>
                    <td>${l.module || '-'}</td>
                    <td>${l.message}</td>
                    <td>${l.ip_address || '-'}</td>
                    <td>${l.created_at ? l.created_at.slice(0, 16) : '-'}</td>
                </tr>`
            ).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No logs</td></tr>';
        }
    } catch(e) { showToast('Error loading logs', 'error'); }
}

// ============= BACKUP =============
async function createBackup() {
    if (!confirm('Create a database backup now?')) return;
    try {
        const res = await api('POST', '/backup/create');
        if (res.success) {
            showToast('Backup created: ' + res.filename, 'success');
            loadBackupHistory();
        } else showToast(res.error || 'Backup failed', 'error');
    } catch(e) { showToast('Backup error', 'error'); }
}

async function loadBackupHistory() {
    const tbody = document.querySelector('#tbl-backups tbody');
    if (!tbody) return;
    try {
        const res = await api('GET', '/backup/list');
        if (res.success && res.backups.length) {
            tbody.innerHTML = res.backups.map(b =>
                `<tr>
                    <td>${b.filename}</td>
                    <td>${b.backup_type}</td>
                    <td>${(b.file_size / 1024).toFixed(1)} KB</td>
                    <td><span class="status-badge ${b.exists ? 'completed' : 'deleted'}">${b.exists ? 'Available' : 'Deleted'}</span></td>
                    <td>${b.created_at ? b.created_at.slice(0, 16) : '-'}</td>
                    <td>
                        ${b.exists ? `<button class="btn-small" onclick="downloadBackup(${b.backup_id})">Download</button>
                        <button class="btn-small" onclick="restoreBackup(${b.backup_id})">Restore</button>
                        <button class="btn-small btn-remove" onclick="deleteBackup(${b.backup_id})">Delete</button>` : ''}
                    </td>
                </tr>`
            ).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No backups yet</td></tr>';
        }
    } catch(e) { showToast('Error loading backups', 'error'); }
}

async function downloadBackup(bid) {
    window.open(API_BASE + '/backup/download/' + bid, '_blank');
}

async function restoreBackup(bid) {
    if (!confirm('WARNING: This will replace the current database. Continue?')) return;
    try {
        const res = await api('POST', '/backup/restore/' + bid);
        if (res.success) {
            showToast('Database restored! Reloading...', 'success');
            setTimeout(() => location.reload(), 2000);
        } else showToast(res.error, 'error');
    } catch(e) { showToast('Restore error', 'error'); }
}

async function deleteBackup(bid) {
    if (!confirm('Delete this backup?')) return;
    const res = await api('DELETE', '/backup/delete/' + bid);
    if (res.success) { showToast('Deleted', 'success'); loadBackupHistory(); }
    else showToast(res.error, 'error');
}

// ----- INIT -----
window.addEventListener('DOMContentLoaded', async () => {
    applySavedTheme();
    updateAuthUI();
    applyRoleNav();
    loadNotifications();
    checkNotifications();
    // Periodic notification check
    setInterval(checkNotifications, 30000);
    setInterval(loadNotifications, 60000);
    if (authToken) showToast('Session restored', 'info');
    // Switch to first allowed view
    const first = document.querySelector('.nav-item:not([style*="display: none"])');
    if (first) switchView(first.dataset.target);
    document.getElementById('product-entry-form')?.addEventListener('submit', handleProductSubmit);
    document.getElementById('supplier-billing-form')?.addEventListener('submit', submitSupplierTransaction);
    document.getElementById('wastage-log-form')?.addEventListener('submit', submitWastageReport);
    document.getElementById('price-configurator-form')?.addEventListener('submit', saveFloatingPrices);
    document.getElementById('wastage-qty')?.addEventListener('input', updateWastageCalculation);
    document.getElementById('login-form')?.addEventListener('submit', submitLogin);

    // New forms
    document.getElementById('product-enhanced-form')?.addEventListener('submit', handleEnhancedProductSubmit);
    document.getElementById('stock-transfer-form')?.addEventListener('submit', submitStockTransfer);
    document.getElementById('stock-audit-form')?.addEventListener('submit', submitStockAudit);
    document.getElementById('purchase-return-form')?.addEventListener('submit', submitPurchaseReturn);
    document.getElementById('grn-form')?.addEventListener('submit', submitGRN);
    document.getElementById('sales-return-form')?.addEventListener('submit', submitSalesReturn);
    document.getElementById('journal-form')?.addEventListener('submit', submitJournalEntry);
    document.getElementById('company-info-form')?.addEventListener('submit', submitCompanyInfo);
});

// ============= ENHANCED PRODUCTS =============
async function loadEnhancedProducts() {
    const q = document.getElementById('product-enhanced-search')?.value.toLowerCase().trim() || '';
    try {
        const res = await api('GET', '/products?_=' + Date.now());
        const prods = Array.isArray(res) ? res : (res.products || []);
        const tbody = document.querySelector('#tbl-enhanced-products tbody');
        if (!tbody) return;
        let filtered = prods;
        if (q) filtered = prods.filter(p => (p.title||'').toLowerCase().includes(q) || (p.sku_barcode||'').includes(q));
        if (filtered.length) {
            tbody.innerHTML = filtered.map(p =>
                '<tr><td><strong>' + (p.title||'') + '</strong></td><td>' + (p.brand||'-') + '</td><td>' +
                (p.sku_barcode||'-') + '</td><td>' + (p.batch_no||'-') + '</td><td>' +
                (p.expiry_date||'-') + '</td><td>' + formatCurrency(p.cost_price||0) + '</td><td>' +
                formatCurrency(p.selling_price||0) + '</td><td>' + (p.current_stock||0) + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="8">No products found.</td></tr>';
        }
        lucideRefresh();
    } catch(e) { showToast('Failed to load products', 'error'); }
}

async function handleEnhancedProductSubmit(e) {
    e.preventDefault();
    const data = {
        title: document.getElementById('prod-title').value.trim(),
        category_id: parseInt(document.getElementById('prod-category')?.value) || null,
        brand: document.getElementById('prod-brand')?.value.trim() || '',
        sku_barcode: document.getElementById('prod-sku')?.value.trim() || null,
        unit_of_measure: document.getElementById('prod-uom')?.value || 'Pcs',
        batch_no: document.getElementById('prod-batch')?.value.trim() || '',
        expiry_date: document.getElementById('prod-expiry')?.value || null,
        cost_price: parseFloat(document.getElementById('prod-cost')?.value || 0),
        selling_price: parseFloat(document.getElementById('prod-price')?.value || 0),
        current_stock: parseFloat(document.getElementById('prod-stock')?.value || 0),
        image_url: document.getElementById('prod-image')?.value.trim() || ''
    };
    if (!data.title) { showToast('Product title required', 'error'); return; }
    const res = await api('POST', '/products', data);
    if (res.success) {
        showToast('Product created! Barcode: ' + (res.sku_barcode || 'auto'), 'success');
        document.getElementById('product-enhanced-form').reset();
        loadEnhancedProducts();
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function loadProductCategories() {
    try {
        const cats = await api('GET', '/categories');
        const sel = document.getElementById('prod-category');
        if (sel && Array.isArray(cats)) {
            sel.innerHTML = '<option value="">Select category...</option>' +
                cats.map(c => '<option value="' + c.category_id + '">' + c.name + '</option>').join('');
        }
    } catch(e) {}
}

// ============= STOCK TRANSFER =============
async function loadTransferBranches() {
    try {
        const res = await api('GET', '/branches');
        if (res.success) {
            const opts = '<option value="">Select branch...</option>' +
                res.branches.map(b => '<option value="' + b.branch_id + '">' + b.name + '</option>').join('');
            const from = document.getElementById('transfer-from-branch');
            const to = document.getElementById('transfer-to-branch');
            if (from) from.innerHTML = opts;
            if (to) to.innerHTML = opts;
        }
    } catch(e) {}
}

async function loadTransferProducts() {
    try {
        const res = await api('GET', '/products');
        const prods = Array.isArray(res) ? res : (res.products || []);
        const opts = '<option value="">Select product...</option>' +
            prods.map(p => '<option value="' + p.product_id + '">' + p.title + ' (' + (p.sku_barcode||'') + ')</option>').join('');
        document.querySelectorAll('.transfer-product').forEach(sel => { if (sel) sel.innerHTML = opts; });
    } catch(e) {}
}

function addTransferItemRow() {
    const container = document.getElementById('transfer-items-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'form-row purchase-item-row';
    row.innerHTML = '<select class="form-group flex-2 transfer-product"><option>Select product...</option></select>' +
        '<input type="number" class="form-group flex-1 transfer-qty" placeholder="Qty" step="0.01">' +
        '<button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(row);
    loadTransferProducts();
}

async function submitStockTransfer(e) {
    e.preventDefault();
    const from_branch_id = parseInt(document.getElementById('transfer-from-branch')?.value);
    const to_branch_id = parseInt(document.getElementById('transfer-to-branch')?.value);
    if (!from_branch_id || !to_branch_id) { showToast('Select both branches', 'error'); return; }
    if (from_branch_id === to_branch_id) { showToast('Cannot transfer to same branch', 'error'); return; }
    const items = [];
    document.querySelectorAll('#transfer-items-container .purchase-item-row').forEach(row => {
        const pid = parseInt(row.querySelector('.transfer-product')?.value);
        const qty = parseFloat(row.querySelector('.transfer-qty')?.value || 0);
        if (pid && qty > 0) items.push({ product_id: pid, qty });
    });
    if (!items.length) { showToast('Add at least one item', 'error'); return; }
    const res = await api('POST', '/inventory/transfer', { from_branch_id, to_branch_id, items });
    if (res.success) {
        showToast('Stock transferred!', 'success');
        document.getElementById('stock-transfer-form').reset();
        loadTransferHistory();
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function loadTransferHistory() {
    try {
        const res = await api('GET', '/inventory'); // reuse inventory list
        const tbody = document.querySelector('#tbl-transfers tbody');
        if (!tbody) return;
        if (res.success && res.inventory && res.inventory.length) {
            tbody.innerHTML = '<tr><td colspan="4">Transfer completed (see Inventory for stock changes).</td></tr>';
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No transfers yet.</td></tr>';
        }
    } catch(e) {}
}

// ============= STOCK AUDIT =============
async function loadAuditBranches() {
    try {
        const res = await api('GET', '/branches');
        if (res.success) {
            const sel = document.getElementById('audit-branch');
            if (sel) sel.innerHTML = '<option value="">Select branch...</option>' +
                res.branches.map(b => '<option value="' + b.branch_id + '">' + b.name + '</option>').join('');
        }
    } catch(e) {}
}

async function loadAuditProducts() {
    try {
        const res = await api('GET', '/products');
        const prods = Array.isArray(res) ? res : (res.products || []);
        const opts = '<option value="">Select product...</option>' +
            prods.map(p => '<option value="' + p.product_id + '">' + p.title + '</option>').join('');
        document.querySelectorAll('.audit-product').forEach(sel => { if (sel) sel.innerHTML = opts; });
    } catch(e) {}
}

function addAuditItemRow() {
    const container = document.getElementById('audit-items-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'form-row purchase-item-row';
    row.innerHTML = '<select class="form-group flex-2 audit-product"><option>Select product...</option></select>' +
        '<input type="number" class="form-group flex-1 audit-expected" placeholder="Expected" step="0.01">' +
        '<input type="number" class="form-group flex-1 audit-actual" placeholder="Actual" step="0.01">' +
        '<button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(row);
    loadAuditProducts();
}

async function submitStockAudit(e) {
    e.preventDefault();
    const branch_id = parseInt(document.getElementById('audit-branch')?.value);
    const notes = document.getElementById('audit-notes')?.value || '';
    if (!branch_id) { showToast('Select branch', 'error'); return; }
    const items = [];
    document.querySelectorAll('#audit-items-container .purchase-item-row').forEach(row => {
        const pid = parseInt(row.querySelector('.audit-product')?.value);
        const expected = parseFloat(row.querySelector('.audit-expected')?.value || 0);
        const actual = parseFloat(row.querySelector('.audit-actual')?.value || 0);
        if (pid) items.push({ product_id: pid, expected_qty: expected, actual_qty: actual });
    });
    if (!items.length) { showToast('Add at least one item', 'error'); return; }
    const res = await api('POST', '/stock-audits', { branch_id, items, notes });
    if (res.success) {
        showToast('Audit completed!', 'success');
        document.getElementById('stock-audit-form').reset();
        loadAuditHistory();
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function loadAuditHistory() {
    try {
        const res = await api('GET', '/stock-audits');
        const tbody = document.querySelector('#tbl-audits tbody');
        if (!tbody) return;
        if (res.success && res.audits.length) {
            tbody.innerHTML = res.audits.map(a =>
                '<tr><td>' + (a.audit_date||'').slice(0,10) + '</td><td>Branch ' + a.branch_id + '</td><td>' +
                a.status + '</td><td>' + (a.items ? a.items.length : 0) + ' items</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No audits yet.</td></tr>';
        }
    } catch(e) {}
}

// ============= PURCHASE RETURN =============
async function loadPRSuppliers() {
    try {
        const res = await api('GET', '/suppliers');
        if (res.success) {
            const sel = document.getElementById('pr-supplier');
            if (sel) sel.innerHTML = '<option value="">Select supplier...</option>' +
                res.suppliers.map(s => '<option value="' + s.supplier_id + '">' + s.name + '</option>').join('');
        }
    } catch(e) {}
}

async function loadPRProducts() {
    try {
        const res = await api('GET', '/products');
        const prods = Array.isArray(res) ? res : (res.products || []);
        const opts = '<option value="">Select product...</option>' +
            prods.map(p => '<option value="' + p.product_id + '">' + p.title + '</option>').join('');
        document.querySelectorAll('.pr-product').forEach(sel => { if (sel) sel.innerHTML = opts; });
    } catch(e) {}
}

function addPRItemRow() {
    const container = document.getElementById('pr-items-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'form-row purchase-item-row';
    row.innerHTML = '<select class="form-group flex-2 pr-product"><option>Select product...</option></select>' +
        '<input type="number" class="form-group flex-1 pr-qty" placeholder="Qty" step="0.01">' +
        '<input type="number" class="form-group flex-1 pr-cost" placeholder="Unit Cost" step="0.01">' +
        '<button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(row);
    loadPRProducts();
}

async function submitPurchaseReturn(e) {
    e.preventDefault();
    const purchase_id = parseInt(document.getElementById('pr-purchase-id')?.value) || null;
    const supplier_id = parseInt(document.getElementById('pr-supplier')?.value);
    const reason = document.getElementById('pr-reason')?.value || '';
    if (!supplier_id) { showToast('Select supplier', 'error'); return; }
    const items = [];
    document.querySelectorAll('#pr-items-container .purchase-item-row').forEach(row => {
        const pid = parseInt(row.querySelector('.pr-product')?.value);
        const qty = parseFloat(row.querySelector('.pr-qty')?.value || 0);
        const cost = parseFloat(row.querySelector('.pr-cost')?.value || 0);
        if (pid && qty > 0) items.push({ product_id: pid, qty, unit_cost: cost });
    });
    if (!items.length) { showToast('Add at least one item', 'error'); return; }
    const res = await api('POST', '/purchase-returns', { purchase_id, supplier_id, reason, items });
    if (res.success) {
        showToast('Return recorded!', 'success');
        document.getElementById('purchase-return-form').reset();
        loadPurchaseReturnHistory();
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function loadPurchaseReturnHistory() {
    try {
        const res = await api('GET', '/purchase-returns');
        const tbody = document.querySelector('#tbl-purchase-returns tbody');
        if (!tbody) return;
        if (res.success && res.returns.length) {
            tbody.innerHTML = res.returns.map(r =>
                '<tr><td>' + (r.return_date||'').slice(0,10) + '</td><td>#' + (r.purchase_id||'') + '</td><td>' +
                formatCurrency(r.total_refund) + '</td><td>' + (r.reason||'') + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No returns yet.</td></tr>';
        }
    } catch(e) {}
}

// ============= GRN =============
async function loadGrnBranches() {
    try {
        const res = await api('GET', '/branches');
        if (res.success) {
            const sel = document.getElementById('grn-branch');
            if (sel) sel.innerHTML = '<option value="">Select branch...</option>' +
                res.branches.map(b => '<option value="' + b.branch_id + '">' + b.name + '</option>').join('');
        }
    } catch(e) {}
}

async function submitGRN(e) {
    e.preventDefault();
    const purchase_id = parseInt(document.getElementById('grn-purchase-id')?.value);
    const branch_id = parseInt(document.getElementById('grn-branch')?.value) || null;
    const note = document.getElementById('grn-notes')?.value || '';
    if (!purchase_id) { showToast('Purchase ID required', 'error'); return; }
    const res = await api('POST', '/grn', { purchase_id, branch_id, note });
    if (res.success) {
        showToast('GRN created!', 'success');
        document.getElementById('grn-form').reset();
        loadGRNHistory();
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function loadGRNHistory() {
    try {
        const res = await api('GET', '/grn');
        const tbody = document.querySelector('#tbl-grns tbody');
        if (!tbody) return;
        if (res.success && res.grns.length) {
            tbody.innerHTML = res.grns.map(g =>
                '<tr><td>' + (g.grn_date||'').slice(0,10) + '</td><td>#' + g.purchase_id + '</td><td>' +
                (g.note||'') + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="3">No GRNs yet.</td></tr>';
        }
    } catch(e) {}
}

// ============= SALES RETURN =============
async function loadSRProducts() {
    try {
        const res = await api('GET', '/products');
        const prods = Array.isArray(res) ? res : (res.products || []);
        const opts = '<option value="">Select product...</option>' +
            prods.map(p => '<option value="' + p.product_id + '">' + p.title + '</option>').join('');
        document.querySelectorAll('.sr-product').forEach(sel => { if (sel) sel.innerHTML = opts; });
    } catch(e) {}
}

function addSRItemRow() {
    const container = document.getElementById('sr-items-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'form-row purchase-item-row';
    row.innerHTML = '<select class="form-group flex-2 sr-product"><option>Select product...</option></select>' +
        '<input type="number" class="form-group flex-1 sr-qty" placeholder="Qty" step="0.01">' +
        '<input type="number" class="form-group flex-1 sr-price" placeholder="Unit Price" step="0.01">' +
        '<button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(row);
    loadSRProducts();
}

async function submitSalesReturn(e) {
    e.preventDefault();
    const sale_id = parseInt(document.getElementById('sr-sale-id')?.value);
    const reason = document.getElementById('sr-reason')?.value || '';
    if (!sale_id) { showToast('Sale ID required', 'error'); return; }
    const items = [];
    document.querySelectorAll('#sr-items-container .purchase-item-row').forEach(row => {
        const pid = parseInt(row.querySelector('.sr-product')?.value);
        const qty = parseFloat(row.querySelector('.sr-qty')?.value || 0);
        const price = parseFloat(row.querySelector('.sr-price')?.value || 0);
        if (pid && qty > 0) items.push({ product_id: pid, qty, unit_price: price });
    });
    if (!items.length) { showToast('Add at least one item', 'error'); return; }
    const res = await api('POST', '/sales-returns', { sale_id, reason, items });
    if (res.success) {
        showToast('Return processed!', 'success');
        document.getElementById('sales-return-form').reset();
        loadSalesReturnHistory();
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function loadSalesReturnHistory() {
    try {
        const res = await api('GET', '/sales-returns');
        const tbody = document.querySelector('#tbl-sales-returns tbody');
        if (!tbody) return;
        if (res.success && res.returns.length) {
            tbody.innerHTML = res.returns.map(r =>
                '<tr><td>' + (r.return_date||'').slice(0,10) + '</td><td>#' + r.sale_id + '</td><td>' +
                formatCurrency(r.total_refund) + '</td><td>' + r.status + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No returns yet.</td></tr>';
        }
    } catch(e) {}
}

// ============= ACCOUNTING =============
async function loadAccountHeads(selectId) {
    try {
        const res = await api('GET', '/account/heads');
        if (res.success) {
            const sel = document.getElementById(selectId);
            if (sel) sel.innerHTML = '<option value="">Select account...</option>' +
                res.heads.map(h => '<option value="' + h.head_id + '">' + h.name + ' (' + h.head_type + ')</option>').join('');
        }
    } catch(e) {}
}

function toggleJournalDrawer() {
    const drawer = document.querySelector('.journal-drawer');
    if (drawer) drawer.classList.toggle('collapsed');
}
function addJournalLineRow() {
    const container = document.getElementById('journal-lines-container');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'form-row purchase-item-row';
    row.innerHTML = '<select class="form-group flex-2 journal-head"><option>Select account...</option></select>' +
        '<input type="number" class="form-group flex-1 journal-debit" placeholder="Debit" step="0.01">' +
        '<input type="number" class="form-group flex-1 journal-credit" placeholder="Credit" step="0.01">' +
        '<button type="button" class="btn-small btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(row);
    loadAccountHeadsForJournal();
}

async function loadAccountHeadsForJournal() {
    try {
        const res = await api('GET', '/account/heads');
        if (res.success) {
            const opts = '<option value="">Select account...</option>' +
                res.heads.map(h => '<option value="' + h.head_id + '">' + h.name + '</option>').join('');
            document.querySelectorAll('.journal-head').forEach(sel => { if (sel) sel.innerHTML = opts; });
        }
    } catch(e) {}
}

async function submitJournalEntry(e) {
    e.preventDefault();
    const description = document.getElementById('journal-desc')?.value || '';
    const lines = [];
    document.querySelectorAll('#journal-lines-container .purchase-item-row').forEach(row => {
        const head_id = parseInt(row.querySelector('.journal-head')?.value);
        const debit = parseFloat(row.querySelector('.journal-debit')?.value || 0);
        const credit = parseFloat(row.querySelector('.journal-credit')?.value || 0);
        if (head_id && (debit > 0 || credit > 0)) lines.push({ head_id, debit, credit });
    });
    if (!lines.length) { showToast('Add at least one journal line', 'error'); return; }
    const res = await api('POST', '/account/journal', { description, lines });
    if (res.success) {
        showToast('Journal entry posted!', 'success');
        document.getElementById('journal-form').reset();
        loadJournalHistory();
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function loadJournalHistory() {
    try {
        const res = await api('GET', '/account/journal');
        const tbody = document.querySelector('#tbl-journal tbody');
        if (!tbody) return;
        if (res.success && res.entries.length) {
            tbody.innerHTML = res.entries.map(e => {
                const totalD = e.lines.reduce((s, l) => s + l.debit, 0);
                const totalC = e.lines.reduce((s, l) => s + l.credit, 0);
                return '<tr><td>' + (e.entry_date||'').slice(0,10) + '</td><td>' + (e.description||'') +
                    '</td><td>' + formatCurrency(totalD) + '</td><td>' + formatCurrency(totalC) + '</td></tr>';
            }).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No entries yet.</td></tr>';
        }
    } catch(e) {}
}

async function loadLedger() {
    const head_id = document.getElementById('ledger-head-filter')?.value;
    const url = '/account/ledger' + (head_id ? '?head_id=' + head_id : '');
    try {
        const res = await api('GET', url);
        const tbody = document.querySelector('#tbl-ledger tbody');
        if (!tbody) return;
        if (res.success && res.ledger.length) {
            tbody.innerHTML = res.ledger.map(l =>
                '<tr><td>' + (l.entry_date||'').slice(0,10) + '</td><td>' + (l.description||'') +
                '</td><td>' + formatCurrency(l.debit) + '</td><td>' + formatCurrency(l.credit) + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No ledger entries.</td></tr>';
        }
    } catch(e) {}
}

async function loadTrialBalance() {
    try {
        const res = await api('GET', '/account/trial-balance');
        const tbody = document.querySelector('#tbl-trial-balance tbody');
        if (!tbody) return;
        if (res.success && res.trial_balance.length) {
            tbody.innerHTML = res.trial_balance.map(t =>
                '<tr><td>' + t.head_name + '</td><td>' + t.head_type + '</td><td>' +
                formatCurrency(t.total_debit) + '</td><td>' + formatCurrency(t.total_credit) + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No data.</td></tr>';
        }
    } catch(e) {}
}

async function loadProfitLoss() {
    try {
        const res = await api('GET', '/account/profit-loss');
        const el = document.getElementById('pl-content');
        if (!el) return;
        if (res.success) {
            let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">';
            html += '<div><h4 style="color:var(--success);">Income</h4>';
            res.income.forEach(i => { html += '<div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border);"><span>' + i.name + '</span><span>' + formatCurrency(i.amount) + '</span></div>'; });
            html += '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;border-top:2px solid var(--success);margin-top:0.5rem;"><span>Total Income</span><span>' + formatCurrency(res.total_income) + '</span></div></div>';
            html += '<div><h4 style="color:var(--danger);">Expenses</h4>';
            res.expenses.forEach(e => { html += '<div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border);"><span>' + e.name + '</span><span>' + formatCurrency(e.amount) + '</span></div>'; });
            html += '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;border-top:2px solid var(--danger);margin-top:0.5rem;"><span>Total Expenses</span><span>' + formatCurrency(res.total_expense) + '</span></div></div>';
            html += '</div>';
            html += '<div style="text-align:center;margin-top:1.5rem;padding:1rem;background:var(--bg-input);border-radius:var(--radius-sm);"><h3 style="margin:0;color:' + (res.net_profit >= 0 ? 'var(--success)' : 'var(--danger)') + ';">Net ' + (res.net_profit >= 0 ? 'Profit' : 'Loss') + ': ' + formatCurrency(res.net_profit) + '</h3></div>';
            el.innerHTML = html;
        } else { el.innerHTML = '<p class="chart-empty">No data.</p>'; }
    } catch(e) { document.getElementById('pl-content').innerHTML = '<p class="chart-empty">Error loading.</p>'; }
}

async function loadBalanceSheet() {
    try {
        const res = await api('GET', '/account/balance-sheet');
        const el = document.getElementById('bs-content');
        if (!el) return;
        if (res.success) {
            let html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">';
            html += '<div><h4 style="color:var(--primary-light);">Assets</h4>';
            res.assets.forEach(a => { html += '<div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border);"><span>' + a.name + '</span><span>' + formatCurrency(a.amount) + '</span></div>'; });
            html += '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;border-top:2px solid var(--primary-light);margin-top:0.5rem;"><span>Total Assets</span><span>' + formatCurrency(res.total_assets) + '</span></div></div>';
            html += '<div><h4 style="color:var(--warning);">Liabilities</h4>';
            res.liabilities.forEach(l => { html += '<div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border);"><span>' + l.name + '</span><span>' + formatCurrency(l.amount) + '</span></div>'; });
            html += '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;border-top:2px solid var(--warning);margin-top:0.5rem;"><span>Total Liabilities</span><span>' + formatCurrency(res.total_liabilities) + '</span></div></div>';
            html += '<div><h4 style="color:var(--success);">Equity</h4>';
            res.equity.forEach(e => { html += '<div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border);"><span>' + e.name + '</span><span>' + formatCurrency(e.amount) + '</span></div>'; });
            html += '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;font-weight:700;border-top:2px solid var(--success);margin-top:0.5rem;"><span>Total Equity</span><span>' + formatCurrency(res.total_equity) + '</span></div></div>';
            html += '</div>';
            el.innerHTML = html;
        } else { el.innerHTML = '<p class="chart-empty">No data.</p>'; }
    } catch(e) { document.getElementById('bs-content').innerHTML = '<p class="chart-empty">Error loading.</p>'; }
}

function switchAccountingTab(tabId) {
    document.querySelectorAll('.acct-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.acct-tab').forEach(t => t.classList.remove('active'));
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');
    const btn = document.querySelector('.acct-tab[data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');
    const dr = document.getElementById('journal-drawer');
    if (dr && tabId !== 'acct-journal') dr.classList.add('collapsed');
    if (dr && tabId === 'acct-journal') dr.classList.remove('collapsed');
    switch(tabId) {
        case 'acct-coa': loadAccountTree(); break;
        case 'acct-voucher': loadVouchers(); populateHeadSelects(); break;
        case 'acct-journal': loadJournalHistory(); break;
        case 'acct-ledger': loadLedger(); break;
        case 'acct-trial': loadTrialBalance(); break;
        case 'acct-pl': loadProfitLoss(); break;
        case 'acct-bs': loadBalanceSheet(); break;
        case 'acct-cashbook': loadCashBook(); break;
        case 'acct-bankbook': loadBankBook(); break;
        case 'acct-cashflow': loadCashFlowReport(); break;
        case 'acct-income': loadIncomeStatement(); break;
    }
}

// ============= REPORTS =============
function downloadBlob(data, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(data);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}
function tableToExcel(rows, filename) {
    if (typeof XLSX === 'undefined') { showToast('Excel library not loaded', 'error'); return; }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), filename);
}
async function exportSalesReport(format) {
    const from = document.getElementById('rpt-sales-from')?.value || '';
    const to = document.getElementById('rpt-sales-to')?.value || '';
    let url = '/reports/sales?format=json';
    if (from) url += '&start=' + from;
    if (to) url += '&end=' + to;
    try {
        const res = await api('GET', url);
        if (!res.success) { showToast('No data', 'info'); return; }
        const data = res.sales || [];
        if (format === 'xlsx') {
            const rows = [['Invoice','Date','Amount','Status']];
            data.forEach(s => rows.push(['#'+s.sale_id, (s.created_at||'').slice(0,10), s.total_amount, s.payment_status]));
            tableToExcel(rows, 'sales_report.xlsx');
            showToast('Excel downloaded', 'success');
            return;
        }
        if (format === 'csv') {
            let csv = 'Invoice,Date,Amount,Status\n';
            data.forEach(s => csv += `#${s.sale_id},${(s.created_at||'').slice(0,10)},${s.total_amount},${s.payment_status}\n`);
            downloadBlob(new Blob([csv], { type: 'text/csv' }), 'sales_report.csv');
            showToast('CSV downloaded', 'success');
            return;
        }
        const tbody = document.querySelector('#tbl-rpt-sales tbody');
        if (!tbody) return;
        if (data.length) {
            tbody.innerHTML = data.map(s =>
                '<tr><td>#' + s.sale_id + '</td><td>' + (s.created_at||'').slice(0,10) + '</td><td>' +
                formatCurrency(s.total_amount) + '</td><td>' + s.payment_status + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No sales found.</td></tr>';
        }
    } catch(e) { showToast('Error loading report', 'error'); }
}

async function exportInventoryReport(format) {
    let url = '/reports/inventory?format=json';
    try {
        const res = await api('GET', url);
        if (!res.success) { showToast('No data', 'info'); return; }
        const data = res.inventory || [];
        if (format === 'xlsx') {
            const rows = [['Product','Stock','Value']];
            data.forEach(i => rows.push([i.product_title, i.current_stock, i.value]));
            tableToExcel(rows, 'inventory_report.xlsx');
            showToast('Excel downloaded', 'success');
            return;
        }
        if (format === 'csv') {
            let csv = 'Product,Stock,Value\n';
            data.forEach(i => csv += `${i.product_title},${i.current_stock},${i.value}\n`);
            downloadBlob(new Blob([csv], { type: 'text/csv' }), 'inventory_report.csv');
            showToast('CSV downloaded', 'success');
            return;
        }
        const tbody = document.querySelector('#tbl-rpt-inventory tbody');
        if (!tbody) return;
        if (data.length) {
            tbody.innerHTML = data.map(i =>
                '<tr><td>' + i.product_title + '</td><td>' + i.current_stock + '</td><td>' +
                formatCurrency(i.value) + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="3">No inventory data.</td></tr>';
        }
    } catch(e) { showToast('Error loading report', 'error'); }
}

// ============= AUDIT LOG =============
function switchAuditTab(tabId) {
    document.querySelectorAll('.audit-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.audit-tab').forEach(t => t.classList.remove('active'));
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');
    const btn = document.querySelector('.audit-tab[data-tab="' + tabId + '"]');
    if (btn) btn.classList.add('active');
    if (tabId === 'audit-logs') loadAuditLogs();
    else if (tabId === 'login-history') loadLoginHistory();
    else if (tabId === 'system-logs') loadSystemLogs('');
}

async function loadAuditLogs() {
    try {
        const res = await api('GET', '/audit-logs');
        const tbody = document.querySelector('#tbl-audit-logs tbody');
        if (!tbody) return;
        if (res.success && res.logs.length) {
            tbody.innerHTML = res.logs.map(l =>
                '<tr><td>' + (l.created_at||'').slice(0,16) + '</td><td>' + (l.username||'') + '</td><td>' +
                l.action + '</td><td>' + (l.entity_type||'') + ' ' + (l.entity_id||'') + '</td><td>' +
                (l.ip_address||'') + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="5">No audit logs yet.</td></tr>';
        }
    } catch(e) {}
}

async function loadLoginHistory() {
    try {
        const res = await api('GET', '/login-history');
        const tbody = document.querySelector('#tbl-login-history tbody');
        if (!tbody) return;
        if (res.success && res.history.length) {
            tbody.innerHTML = res.history.map(h =>
                '<tr><td>' + (h.login_time||'').slice(0,16) + '</td><td>' + (h.username||'') + '</td><td>' +
                '<span style="color:' + (h.status === 'success' ? 'var(--success)' : 'var(--danger)') + '">' +
                h.status + '</span></td><td>' + (h.ip_address||'') + '</td></tr>'
            ).join('');
        } else {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4">No login records yet.</td></tr>';
        }
    } catch(e) {}
}

// ============= SYSTEM SETTINGS =============
async function loadSettings() {
    try {
        const res = await api('GET', '/settings/company');
        if (res.success) {
            const c = res.company || {};
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('set-company-name', c.company_name);
            setVal('set-company-tagline', c.tagline);
            setVal('set-company-address', c.address);
            setVal('set-company-city', c.city);
            setVal('set-company-phone', c.phone);
            setVal('set-company-email', c.email);
            setVal('set-company-website', c.website);
            setVal('set-company-vat-reg', c.vat_reg);
            setVal('set-company-branch', c.branch);
            setVal('set-vat-rate', c.vat_rate);
            setVal('set-company-tax-id', c.tax_id);
            setVal('set-company-logo', c.logo_url);
            setVal('set-receipt-logo', c.receipt_logo);
            setVal('set-currency', c.currency);
            setVal('set-language', c.language);
            setVal('set-timezone', c.timezone);
            setVal('set-invoice-prefix', c.invoice_prefix);
            setVal('set-return-policy', c.return_policy);
            setVal('set-invoice-footer', c.invoice_footer);
        }
        loadBackupHistory();
    } catch(e) {}
}

async function submitCompanyInfo(e) {
    e.preventDefault();
    const $ = id => document.getElementById(id)?.value || '';
    const company = {
        company_name: $('set-company-name'),
        tagline: $('set-company-tagline'),
        address: $('set-company-address'),
        city: $('set-company-city'),
        phone: $('set-company-phone'),
        email: $('set-company-email'),
        website: $('set-company-website'),
        vat_reg: $('set-company-vat-reg'),
        branch: $('set-company-branch'),
        vat_rate: parseFloat($('set-vat-rate')) || 5,
        tax_id: $('set-company-tax-id'),
        logo_url: $('set-company-logo'),
        receipt_logo: $('set-receipt-logo'),
        currency: $('set-currency') || 'BDT',
        language: $('set-language') || 'en',
        timezone: $('set-timezone') || 'Asia/Dhaka',
        invoice_prefix: $('set-invoice-prefix') || 'INV-',
        return_policy: $('set-return-policy'),
        invoice_footer: $('set-invoice-footer')
    };
    const res = await api('POST', '/settings/company', company);
    if (res.success) {
        // Sync to localStorage for immediate use
        const map = {
            company_name: 'company_name', tagline: 'company_tagline',
            address: 'company_address', city: 'company_city',
            phone: 'company_phone', email: 'company_email',
            website: 'company_website', vat_reg: 'company_vat_reg',
            branch: 'company_branch', vat_rate: 'vat_rate',
            invoice_prefix: 'invoice_prefix', return_policy: 'return_policy',
            invoice_footer: 'footer_text', receipt_logo: 'receipt_logo'
        };
        for (const [key, lsKey] of Object.entries(map)) {
            localStorage.setItem(lsKey, company[key]);
        }
        // Update COMPANY object
        Object.assign(COMPANY, {
            name: company.company_name,
            tagline: company.tagline,
            address: company.address,
            city: company.city,
            phone: company.phone,
            email: company.email,
            website: company.website,
            vat_reg: company.vat_reg,
            branch: company.branch,
            vat_rate: company.vat_rate,
            invoice_prefix: company.invoice_prefix,
            return_policy: company.return_policy,
            footer_text: company.invoice_footer,
            receipt_logo: company.receipt_logo
        });
        showToast('Company info saved!', 'success');
    } else { showToast(res.error || 'Failed', 'error'); }
}

async function backupDatabase() {
    createBackup();
}
