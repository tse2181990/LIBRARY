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
        const { error } = await _supabase.from('books').insert([{ category, title, author, serial, issued: false, due_date: null }]);
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

// --- ISSUE & RETURN LOGIC (使用 books 表的 due_date 字段) ---

async function populateIssueSelect() {
    const { data: avail } = await _supabase.from('books').select('*').eq('issued', false);
    const select = document.getElementById('issue-book-select');
    if (!avail || avail.length === 0) {
        select.innerHTML = '<option value="">No items available</option>';
        return;
    }
    select.innerHTML = avail.map(b => `<option value="${b.serial}">${b.title} (${b.serial})</option>`).join('');
    
    // 默认借出日期为今天 + 14 天
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    document.getElementById('issue-date').value = defaultDue.toISOString().split('T')[0];
}

async function handleIssue() {
    const serial = document.getElementById('issue-book-select').value;
    if (!serial) return alert("Please select an item to issue");
    
    const dueDate = document.getElementById('issue-date').value;
    if (!dueDate) return alert("Please select a due date");
    
    // 获取书籍信息
    const { data: book, error: bookError } = await _supabase
        .from('books')
        .select('title')
        .eq('serial', serial)
        .single();
    
    if (bookError || !book) return alert("Book not found");
    
    // 更新 books 表：标记为已借出，并记录 due_date
    const { error: updateError } = await _supabase
        .from('books')
        .update({ issued: true, due_date: dueDate })
        .eq('serial', serial);
    
    if (updateError) {
        return alert("Failed to issue item: " + updateError.message);
    }
    
    alert(`Item "${book.title}" issued! Due date: ${dueDate}`);
    showSection('search');
}

async function populateReturnSelect() {
    // 查询已借出且有 due_date 的书籍
    const { data: issuedItems, error } = await _supabase
        .from('books')
        .select('serial, title, due_date')
        .eq('issued', true);
    
    const select = document.getElementById('return-book-select');
    
    if (error) {
        console.error("Error fetching issued items:", error);
        select.innerHTML = '<option value="">Error loading items</option>';
        return;
    }
    
    if (!issuedItems || issuedItems.length === 0) {
        select.innerHTML = '<option value="">No items currently issued</option>';
    } else {
        select.innerHTML = issuedItems.map(item => 
            `<option value="${item.serial}" data-due="${item.due_date || ''}">${item.title} (${item.serial}) - Due: ${item.due_date || 'No due date'}</option>`
        ).join('');
    }
    
    document.getElementById('actual-return-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('fine-panel').classList.add('hidden');
    pendingReturnData = null;
}

async function calculateReturn() {
    const select = document.getElementById('return-book-select');
    const serial = select.value;
    
    if (!serial) return alert("Please select an item to return");
    
    // 从选中的 option 获取 due_date
    const selectedOption = select.options[select.selectedIndex];
    let dueDateStr = selectedOption.getAttribute('data-due');
    
    if (!dueDateStr || dueDateStr === 'null' || dueDateStr === '') {
        // 如果没有 due_date，从数据库再查一次
        const { data: book } = await _supabase
            .from('books')
            .select('due_date')
            .eq('serial', serial)
            .single();
        dueDateStr = book?.due_date;
    }
    
    if (!dueDateStr) {
        document.getElementById('fine-panel').classList.remove('hidden');
        document.getElementById('fine-amount').innerHTML = `Fine: $0.00 <span class="text-yellow-500 text-xs ml-2">(No due date on record)</span>`;
        document.getElementById('fine-paid').checked = true;
        pendingReturnData = { serial, fine: 0 };
        return;
    }
    
    const returnDateStr = document.getElementById('actual-return-date').value;
    if (!returnDateStr) return alert("Please select the return date");
    
    const returnDate = new Date(returnDateStr);
    const dueDate = new Date(dueDateStr);
    
    // 重置时间部分，只比较日期
    returnDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    // 计算延迟天数
    const diffTime = returnDate - dueDate;
    const delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 每天罚款 $5，只有延迟才罚款
    let fine = delayDays > 0 ? delayDays * 5 : 0;
    
    pendingReturnData = { serial, fine };
    document.getElementById('fine-panel').classList.remove('hidden');
    
    const fineElement = document.getElementById('fine-amount');
    if (delayDays > 0) {
        fineElement.innerHTML = `Fine: $${fine}.00 <span class="text-red-500 text-xs ml-2">(${delayDays} days late)</span>`;
    } else if (delayDays === 0) {
        fineElement.innerHTML = `Fine: $0.00 <span class="text-green-500 text-xs ml-2">(Returned on due date)</span>`;
    } else {
        fineElement.innerHTML = `Fine: $0.00 <span class="text-green-500 text-xs ml-2">(${Math.abs(delayDays)} days early)</span>`;
    }
    
    document.getElementById('fine-paid').checked = fine === 0;
}

async function processReturn() {
    if (!pendingReturnData) return alert("Please calculate fine first");
    
    if (pendingReturnData.fine > 0 && !document.getElementById('fine-paid').checked) {
        return alert("Please confirm fine payment first");
    }
    
    const serial = pendingReturnData.serial;
    
    // 更新 books 表：标记为未借出，清空 due_date
    const { error: updateError } = await _supabase
        .from('books')
        .update({ issued: false, due_date: null })
        .eq('serial', serial);
    
    if (updateError) {
        return alert("Failed to process return: " + updateError.message);
    }
    
    // 如果有罚款，可以记录到控制台或 fines 表
    if (pendingReturnData.fine > 0) {
        console.log(`Fine collected: $${pendingReturnData.fine} for item ${serial}`);
        // 可选：保存到 fines 表
        try {
            const { data: finesTable } = await _supabase.from('fines').select('count');
            if (finesTable !== null) {
                await _supabase.from('fines').insert([{
                    serial: serial,
                    amount: pendingReturnData.fine,
                    paid: true,
                    date: new Date().toISOString().split('T')[0]
                }]);
            }
        } catch (e) {
            // fines 表不存在，忽略
            console.log("Fines table not found, skipping fine record");
        }
    }
    
    alert(`Item returned successfully!${pendingReturnData.fine > 0 ? ` Fine collected: $${pendingReturnData.fine}.00` : ''}`);
    pendingReturnData = null;
    showSection('search');
}
