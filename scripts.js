// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://weojhzvotiljokprgqrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlb2poenZvdGlsam9rcHJncXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjQ4MTksImV4cCI6MjA4OTkwMDgxOX0.fT4rBuKYE_q94yoe5gSVa5aQVv2ypgr1LXpcPJIXEE4';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PLAN_OPTIONS = ["6 Months", "1 Year", "2 Years", "Lifetime"];

// --- STATE MANAGEMENT ---
let currentUser = null;
let pendingReturnData = null;

// --- AUTHENTICATION ---
function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    
    if (user === 'admin' && pass === 'admin123') {
        currentUser = { name: 'Administrator', role: 'admin' };
    } else if (user === 'user' && pass === 'user123') {
        currentUser = { name: 'Standard User', role: 'user' };
    } else {
        return alert("Invalid Credentials");
    }

    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-badge').innerText = currentUser.role === 'admin' ? 'A' : 'U';
    document.getElementById('user-name').innerText = currentUser.name;
    
    setupNavigation();
    showSection('search');
}

function logout() { location.reload(); }

// --- NAVIGATION ---
function setupNavigation() {
    const nav = document.getElementById('nav-menu');
    let menuItems = [
        { id: 'search', label: 'Inventory', icon: '📊' },
        { id: 'issue', label: 'Issue Item', icon: '📤' },
        { id: 'return', label: 'Return Item', icon: '📥' }
    ];
    
    if (currentUser.role === 'admin') {
        menuItems.push({ id: 'membership', label: 'Memberships', icon: '👥' });
        menuItems.push({ id: 'add-book', label: 'Add Item', icon: '➕' });
    }
    
    nav.innerHTML = menuItems.map(item => `
        <a href="#" onclick="showSection('${item.id}')" id="nav-${item.id}">
            <span>${item.icon}</span> ${item.label}
        </a>
    `).join('');
}

async function showSection(id) {
    document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('#nav-menu a').forEach(a => a.classList.remove('active-link'));
    
    const section = document.getElementById(`section-${id}`);
    if (section) section.classList.remove('hidden');
    
    const navElem = document.getElementById(`nav-${id}`);
    if(navElem) navElem.classList.add('active-link');
    
    document.getElementById('page-title').innerText = id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' ');

    if (id === 'search') await renderBookTable();
    if (id === 'issue') await populateIssueSelect();
    if (id === 'return') await populateReturnSelect();
    if (id === 'membership') {
        await initMembershipForm();
        await renderMembershipTable();
    }
}

// --- MEMBERSHIP LOGIC ---
async function initMembershipForm() {
    const { data } = await _supabase.from('memberships').select('id');
    const nextNum = (data && data.length > 0) ? data.length + 1001 : 1001;
    document.getElementById('mem-id').value = `LIB-${nextNum}`;
    
    const planSelect = document.getElementById('mem-plan');
    planSelect.innerHTML = PLAN_OPTIONS.map(plan => `<option value="${plan}">${plan}</option>`).join('');
}

async function renderMembershipTable() {
    const { data: memberships } = await _supabase.from('memberships').select('*');
    const tbody = document.getElementById('member-table-body');
    
    if (!memberships || memberships.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">No active memberships.</td></tr>`;
        return;
    }
    tbody.innerHTML = memberships.map((m) => `
        <tr class="text-sm">
            <td class="px-6 py-4 font-mono text-blue-600 font-bold">${m.id}</td>
            <td class="px-6 py-4 font-bold text-slate-900">${m.name}</td>
            <td class="px-6 py-4"><span class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">${m.plan}</span></td>
            <td class="px-6 py-4 text-right space-x-2">
                <button onclick="cancelMembership('${m.id}')" class="text-red-600 hover:underline text-xs font-bold">Remove</button>
            </td>
        </tr>
    `).join('');
}

async function handleSaveMembership() {
    const id = document.getElementById('mem-id').value;
    const name = document.getElementById('mem-name').value;
    const plan = document.getElementById('mem-plan').value;
    
    if (!name) return alert("Member name is mandatory");
    
    const { error } = await _supabase.from('memberships').insert([{ id, name, plan }]);
    if (error) return alert("Error saving membership: " + error.message);
    
    document.getElementById('mem-name').value = "";
    await initMembershipForm();
    await renderMembershipTable();
    alert(`Membership created for ${name}`);
}

async function cancelMembership(id) {
    if (confirm(`Remove member ${id}?`)) {
        await _supabase.from('memberships').delete().eq('id', id);
        await renderMembershipTable();
    }
}

// --- INVENTORY LOGIC ---
async function renderBookTable() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const tbody = document.getElementById('book-table-body');
    
    const { data: books } = await _supabase.from('books').select('*');
    if (!books) return;

    const filtered = books.filter(b =>
        (b.title || "").toLowerCase().includes(query) ||
        (b.author || "").toLowerCase().includes(query) ||
        (b.serial || "").toLowerCase().includes(query)
    );

    tbody.innerHTML = filtered.map((b) => `
        <tr class="text-sm text-gray-700">
            <td class="px-6 py-4 font-medium text-gray-400">${b.category}</td>
            <td class="px-6 py-4 font-bold text-gray-900">${b.title}</td>
            <td class="px-6 py-4">${b.author}</td>
            <td class="px-6 py-4 font-mono text-xs text-blue-600">${b.serial}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-md text-xs font-bold ${b.issued ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
                    ${b.issued ? 'ISSUED' : 'AVAILABLE'}
                </span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
                ${currentUser.role === 'admin' ? `
                    <button onclick="editBook('${b.serial}')" class="text-blue-600 hover:underline font-semibold text-xs bg-blue-50 px-2 py-1 rounded">Edit</button>
                    <button onclick="deleteBook('${b.serial}', ${b.issued})" class="text-red-600 hover:underline font-semibold text-xs bg-red-50 px-2 py-1 rounded">Delete</button>
                ` : '<span class="text-slate-300">-</span>'}
            </td>
        </tr>
    `).join('');
}

async function handleSaveBook() {
    const title = document.getElementById('add-title').value;
    const author = document.getElementById('add-author').value;
    const serial = document.getElementById('add-serial').value;
    const category = document.getElementById('add-category').value;
    const isEdit = document.getElementById('edit-index').value !== "-1";

    if (!title || !author || !serial) return alert("Please fill all fields");

    if (!isEdit) {
        const { error } = await _supabase.from('books').insert([{ category, title, author, serial, issued: false }]);
        if (error) return alert("Serial must be unique.");
    } else {
        await _supabase.from('books').update({ category, title, author }).eq('serial', serial);
    }
    
    resetBookForm();
    showSection('search');
}

async function editBook(serial) {
    const { data: book } = await _supabase.from('books').select('*').eq('serial', serial).single();
    showSection('add-book');
    document.getElementById('form-title').innerText = "Update Item Details";
    document.getElementById('edit-index').value = "1";
    document.getElementById('add-category').value = book.category;
    document.getElementById('add-title').value = book.title;
    document.getElementById('add-author').value = book.author;
    document.getElementById('add-serial').value = book.serial;
    document.getElementById('add-serial').disabled = true;
}

async function deleteBook(serial, issued) {
    if (issued) return alert("Error: Cannot delete an issued item.");
    if (confirm(`Delete item ${serial}?`)) {
        await _supabase.from('books').delete().eq('serial', serial);
        renderBookTable();
    }
}

function resetBookForm() {
    document.getElementById('form-title').innerText = "Add New Inventory Item";
    document.getElementById('edit-index').value = "-1";
    document.getElementById('add-title').value = "";
    document.getElementById('add-author').value = "";
    document.getElementById('add-serial').value = "";
    document.getElementById('add-serial').disabled = false;
}

// --- ISSUE & RETURN LOGIC ---
async function populateIssueSelect() {
    const { data: avail } = await _supabase.from('books').select('*').eq('issued', false);
    const select = document.getElementById('issue-book-select');
    if (!avail || avail.length === 0) {
        select.innerHTML = '<option value="">No items available</option>';
        return;
    }
    select.innerHTML = avail.map(b => `<option value="${b.serial}">${b.title}</option>`).join('');
    document.getElementById('issue-date').value = new Date(Date.now() + 12096e5).toISOString().split('T')[0];
}

async function handleIssue() {
    const serial = document.getElementById('issue-book-select').value;
    if (!serial) return alert("No books available");
    
    const { data: book } = await _supabase.from('books').select('title').eq('serial', serial).single();
    const dueDate = document.getElementById('issue-date').value;

    await _supabase.from('books').update({ issued: true }).eq('serial', serial);
    await _supabase.from('issued_items').insert([{ serial, title: book.title, due_date: dueDate }]);
    
    alert("Book Issued!");
    showSection('search');
}

async function populateReturnSelect() {
    // Query the books table for anything where issued is true
    const { data: issued, error } = await _supabase.from('books')
        .select('serial, title')
        .eq('issued', true);
    
    const select = document.getElementById('return-book-select');
    
    if (error || !issued || issued.length === 0) {
        select.innerHTML = '<option value="">No items currently issued</option>';
    } else {
        select.innerHTML = issued.map(b => `<option value="${b.serial}">${b.title} (${b.serial})</option>`).join('');
    }
    
    document.getElementById('actual-return-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('fine-panel').classList.add('hidden');
}

async function calculateReturn() {
    const serial = document.getElementById('return-book-select').value;
    if (!serial) return alert("No items to return");
    
    const { data: item } = await _supabase.from('issued_items').select('*').eq('serial', serial).single();
    
    let fine = 0;
    // If record is found, calculate fine. If not, default fine to 0.
    if (item) {
        const returnDate = new Date(document.getElementById('actual-return-date').value);
        const dueDate = new Date(item.due_date);
        const delay = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 ));
        fine = delay > 0 ? delay * 5 : 0;
    } else {
        console.warn("No issue record found for fine calculation. Defaulting to $0.");
    }
    
    pendingReturnData = { serial, fine };
    document.getElementById('fine-panel').classList.remove('hidden');
    document.getElementById('fine-amount').innerText = `Fine: $${fine}.00`;
    document.getElementById('fine-paid').checked = fine === 0;
}

async function processReturn() {
    if (pendingReturnData.fine > 0 && !document.getElementById('fine-paid').checked) {
        return alert("Please confirm fine payment first");
    }
    
    await _supabase.from('books').update({ issued: false }).eq('serial', pendingReturnData.serial);
    await _supabase.from('issued_items').delete().eq('serial', pendingReturnData.serial);
    
    alert("Book Returned!");
    showSection('search');
}
