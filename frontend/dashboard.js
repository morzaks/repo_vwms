const API_URL = 'https://script.google.com/macros/s/AKfycbyiK14YKJqMPnmssIRupBqsh8i5yzdXqFDJdzvZLPrUYCDzgUA1btkomjns2vM2l_eQ7w/exec';

const managerEmail = localStorage.getItem('manager_email');
if(!managerEmail) window.location.href = 'manager.html'; 
document.getElementById('userEmailDisplay').textContent = managerEmail;

let globalData = []; 
let currentFilteredData = []; 

// FUNGSI LOAD DATA REQUESTS DARI API
async function fetchRequestsData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_all_requests', payload: { Manager_Email: managerEmail } })
        });
        const result = await response.json();

        if(result.status === 'success') {
            globalData = result.data;
            applyFilter(); 
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="7" class="p-4 text-center text-red-500">Gagal memuat data jaringan.</td></tr>';
    }
}

// FUNGSI LOAD TAGGING ROLE DARI SPREADSHEET (MASTER_OPTION)
async function loadVisitorRoles() {
    const roleSelect = document.getElementById('visitor_role');
    if (!roleSelect) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_options' }) 
        });
        const result = await response.json();

        if(result.status === 'success') {
            roleSelect.innerHTML = '<option value="">-- Kosongkan untuk Default (Wajib Cek KTP) --</option>';
            
            result.data.forEach(role => {
                const option = document.createElement('option');
                option.value = role;
                option.textContent = role;
                roleSelect.appendChild(option);
            });
        } else {
            roleSelect.innerHTML = '<option value="">Gagal memuat opsi</option>';
        }
    } catch (error) {
        console.error('Error fetching visitor roles:', error);
        roleSelect.innerHTML = '<option value="">Terjadi kesalahan jaringan</option>';
    }
}

// FUNGSI FILTER TANGGAL
function applyFilter() {
    let filteredData = globalData;
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;

    if (startDate) {
        filteredData = filteredData.filter(req => new Date(req.Raw_Date) >= new Date(startDate));
    }
    if (endDate) {
        let end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter(req => new Date(req.Raw_Date) <= end);
    }

    currentFilteredData = filteredData; 
    renderSummaryCards(filteredData);
    renderTable(filteredData);
}

function resetFilter() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    applyFilter();
}

// RENDER SUMMARY CARDS
function renderSummaryCards(data) {
    const summaryCards = document.getElementById('summaryCards');
    summaryCards.innerHTML = ''; 
    
    let whGroups = {};

    data.forEach(req => {
        if (!whGroups[req.Warehouse_Code]) {
            whGroups[req.Warehouse_Code] = { total: 0, pending: 0, approved: 0, rejected: 0 };
        }
        whGroups[req.Warehouse_Code].total++;
        if (req.Status === 'Pending') whGroups[req.Warehouse_Code].pending++;
        if (req.Status === 'Approved' || req.Status === 'Checked-In') whGroups[req.Warehouse_Code].approved++;
        if (req.Status === 'Rejected' || req.Status === 'Rejected (Auto)') whGroups[req.Warehouse_Code].rejected++;
    });

    for (const [wh, counts] of Object.entries(whGroups)) {
        summaryCards.innerHTML += `
            <div class="bg-white rounded-xl shadow p-6 border-t-4 border-blue-600 w-80 flex-shrink-0">
                <h3 class="font-bold text-xl text-slate-800 mb-4">${wh}</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center border-b pb-2">
                        <span class="text-slate-500 text-sm">Total Request</span>
                        <span class="font-bold text-blue-600">${counts.total}</span>
                    </div>
                    <div class="flex justify-between items-center border-b pb-2">
                        <span class="text-slate-500 text-sm">Menunggu Approval</span>
                        <span class="font-bold text-yellow-600">${counts.pending}</span>
                    </div>
                    <div class="flex justify-between items-center border-b pb-2">
                        <span class="text-slate-500 text-sm">Disetujui / Di Lokasi</span>
                        <span class="font-bold text-green-600">${counts.approved}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 text-sm">Ditolak</span>
                        <span class="font-bold text-red-600">${counts.rejected}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// RENDER TABEL UTAMA
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ''; 

    if (data.length > 0) {
        data.forEach(req => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition";
            
            let statusBadge = '';
            let actionBtn = '';

            if (req.Status === 'Approved') {
                statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Approved</span>';
                actionBtn = `<button disabled class="bg-slate-200 text-slate-400 text-sm font-semibold py-1.5 px-4 rounded cursor-not-allowed">Done</button>`;
            } else if (req.Status === 'Checked-In') {
                statusBadge = '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Checked-In</span>';
                actionBtn = `<button disabled class="bg-slate-200 text-slate-400 text-sm font-semibold py-1.5 px-4 rounded cursor-not-allowed">Di Lokasi</button>`;
            } else if (req.Status === 'Rejected' || req.Status === 'Rejected (Auto)') {
                statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Rejected</span>';
                actionBtn = `<button disabled class="bg-slate-200 text-slate-400 text-sm font-semibold py-1.5 px-3 rounded cursor-not-allowed">Ditolak</button>`;
            } else { 
                statusBadge = '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pending</span>';
                actionBtn = `
                    <div class="flex gap-2 justify-center">
                        <button onclick="openApproveModal('${req.Request_ID}')" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-3 rounded shadow transition">Approve</button>
                        <button onclick="rejectRequest('${req.Request_ID}', this)" class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-1.5 px-3 rounded shadow transition">Reject</button>
                    </div>`;
            }

            // Cegah error tampilan jika tanggal bernilai "undefined"
            let tanggalTampil = (req.Visit_Date && req.Visit_Date !== "undefined") ? req.Visit_Date : "-";

            tr.innerHTML = `
                <td class="p-4 text-sm font-medium text-slate-700">${req.Request_ID}</td>
                <td class="p-4 text-sm text-slate-600">${req.Name}</td>
                <td class="p-4 text-sm text-slate-600">${req.Company}</td>
                <td class="p-4 text-sm text-slate-600">${tanggalTampil}</td>
                <td class="p-4 text-sm text-slate-600">
                    <span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">${req.Warehouse_Code}</span>
                </td>
                <td class="p-4 text-center">${statusBadge}</td>
                <td class="p-4 text-center">${actionBtn}</td>
            `;
            tableBody.appendChild(tr);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-500">Tidak ada request.</td></tr>';
    }
}

// FUNGSI REJECT
async function rejectRequest(reqId, btnElement) {
    if(!confirm('Yakin ingin me-reject request ini?')) return;
    btnElement.innerText = "Processing...";
    btnElement.disabled = true;

    let reqIndex = globalData.findIndex(r => r.Request_ID === reqId);
    if(reqIndex !== -1) {
        globalData[reqIndex].Status = 'Rejected';
        applyFilter(); 
    }

    try {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'reject_request', payload: { Request_ID: reqId } })
        });
    } catch(err) {
        console.log("Proses background berjalan...");
    }
}

function logout() {
    localStorage.removeItem('manager_email');
    window.location.href = 'manager.html';
}

// ==========================================
// INISIALISASI AWAL (SAAT HALAMAN DIBUKA)
// ==========================================
async function initDashboard() {
    // 1. Tarik data tabel utama dulu (Prioritas UI)
    await fetchRequestsData(); 
    
    // 2. Setelah tabel beres, baru diam-diam tarik data role untuk modal
    await loadVisitorRoles();  
}

initDashboard(); // Jalankan antrian

// EXPORT TO CSV
function exportToCSV() {
    if (currentFilteredData.length === 0) {
        alert("Tidak ada data untuk di-export!");
        return;
    }

    let csvContent = "Request_ID,Nama,Perusahaan,Jadwal_Kunjungan,Gudang,Status\n";

    currentFilteredData.forEach(req => {
        let name = `"${req.Name}"`;
        let company = `"${req.Company}"`;
        let tanggalTampil = (req.Visit_Date && req.Visit_Date !== "undefined") ? req.Visit_Date : "-";
        
        csvContent += `${req.Request_ID},${name},${company},${tanggalTampil},${req.Warehouse_Code},${req.Status}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const todayDate = new Date().toISOString().slice(0,10);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_VWMS_${todayDate}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// AUTO REFRESH DASHBOARD (BACKGROUND)
setInterval(() => {
    fetchDashboardDataInBackground();
}, 15000);

async function fetchDashboardDataInBackground() {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'get_all_requests', 
                payload: { Manager_Email: localStorage.getItem('manager_email') } 
            })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            globalData = result.data;
            applyFilter(); 
        }
    } catch(err) {
        console.log("Auto-refresh tertunda karena jaringan...");
    }
}

// ADD ACCOUNT (MODAL & LOGIC)
function openAccountModal() { document.getElementById('accountModal').classList.remove('hidden'); }
function closeAccountModal() { document.getElementById('accountModal').classList.add('hidden'); }

function toggleAccountFields() {
    let role = document.getElementById('accRole').value;
    document.getElementById('passwordField').classList.toggle('hidden', role !== 'Security');
    document.getElementById('warehouseField').classList.toggle('hidden', role === 'Manager_All');
}

async function submitNewAccount(e) {
    e.preventDefault(); 
    const btn = document.getElementById('submitAccBtn');
    btn.innerText = "Memproses...";
    btn.disabled = true;

    const payload = {
        Executor_Email: localStorage.getItem('manager_email'),
        Role: document.getElementById('accRole').value,
        Username_Email: document.getElementById('accUsername').value,
        Password: document.getElementById('accPassword').value,
        Warehouse: document.getElementById('accWarehouse').value
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add_account', payload: payload })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            alert('Sukses: ' + result.message);
            closeAccountModal();
            document.getElementById('addAccountForm').reset();
            toggleAccountFields(); 
        } else {
            alert('Gagal: ' + result.message);
        }
    } catch(err) {
        alert('Gagal koneksi ke server.');
    } finally {
        btn.innerText = "Simpan Akun";
        btn.disabled = false;
    }
}

// MODAL APPROVE (TAGGING ROLE)
let selectedRequestId = "";

function openApproveModal(reqId) {
    selectedRequestId = reqId;
    if(document.getElementById('visitor_role')) {
        document.getElementById('visitor_role').value = ""; 
    }
    document.getElementById('approveModal').classList.remove('hidden');
}

function closeApproveModal() {
    document.getElementById('approveModal').classList.add('hidden');
}

async function submitApproveWithRole() {
    const btn = document.getElementById('confirmApproveBtn');
    const roleEl = document.getElementById('visitor_role');
    const role = roleEl ? roleEl.value : "";
    
    btn.innerText = "Memproses...";
    btn.disabled = true;

    let reqIndex = globalData.findIndex(r => r.Request_ID === selectedRequestId);
    if(reqIndex !== -1) {
        globalData[reqIndex].Status = 'Approved';
        applyFilter(); 
    }

    closeApproveModal();

    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'approve_request', 
                payload: { 
                    Request_ID: selectedRequestId, 
                    Visitor_Role: role,
                    Manager_Email: localStorage.getItem('manager_email') 
                } 
            })
        });
    } catch(err) {
        console.log("Proses background berjalan...");
    } finally {
        btn.innerText = "Confirm Approve";
        btn.disabled = false;
    }
}