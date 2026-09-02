const API_URL = 'https://script.google.com/macros/s/AKfycbyiK14YKJqMPnmssIRupBqsh8i5yzdXqFDJdzvZLPrUYCDzgUA1btkomjns2vM2l_eQ7w/exec';

const managerEmail = localStorage.getItem('manager_email');
if(!managerEmail) window.location.href = 'manager.html'; 
document.getElementById('userEmailDisplay').textContent = managerEmail;

let globalData = []; // Menyimpan semua data dari API agar tidak perlu loading berulang
let currentFilteredData = []; // VARIABEL BARU UNTUK MENYIMPAN DATA YANG AKAN DI-EXPORT

// FUNGSI LOAD DATA DARI API (Sekali panggil)
async function fetchRequestsData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_all_requests', payload: { Manager_Email: managerEmail } })
        });
        const result = await response.json();

        if(result.status === 'success') {
            globalData = result.data;
            applyFilter(); // Render ke tabel & summary
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="7" class="p-4 text-center text-red-500">Gagal memuat data jaringan.</td></tr>';
    }
}

// FUNGSI FILTER TANGGAL (Berjalan cepat di browser)
function applyFilter() {
    let filteredData = globalData;
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;

    if (startDate) {
        filteredData = filteredData.filter(req => new Date(req.Raw_Date) >= new Date(startDate));
    }
    if (endDate) {
        // Set waktu di ujung hari agar mencakup keseluruhan hari tersebut
        let end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter(req => new Date(req.Raw_Date) <= end);
    }

    currentFilteredData = filteredData; // SIMPAN DATA KE VARIABEL BARU INI

    renderSummaryCards(filteredData);
    renderTable(filteredData);
}

function resetFilter() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    applyFilter();
}

// FUNGSI RENDER SUMMARY CARDS (Menambahkan baris "Ditolak")
function renderSummaryCards(data) {
    const summaryCards = document.getElementById('summaryCards');
    summaryCards.innerHTML = ''; // Bersihkan container
    
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

// FUNGSI RENDER TABEL (Menambahkan kondisi Rejected)
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
            } else { // Jika Pending
                statusBadge = '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pending</span>';
                actionBtn = `
                    <div class="flex gap-2 justify-center">
                        <button onclick="approveRequest('${req.Request_ID}', this)" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-3 rounded shadow transition">Approve</button>
                        <button onclick="rejectRequest('${req.Request_ID}', this)" class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-1.5 px-3 rounded shadow transition">Reject</button>
                    </div>`;
            }

            tr.innerHTML = `
                <td class="p-4 text-sm font-medium text-slate-700">${req.Request_ID}</td>
                <td class="p-4 text-sm text-slate-600">${req.Name}</td>
                <td class="p-4 text-sm text-slate-600">${req.Company}</td>
                <td class="p-4 text-sm text-slate-600">${req.Visit_Date}</td>
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

// ==========================================
// FUNGSI APPROVE INSTAN (OPTIMISTIC UI)
// ==========================================
async function approveRequest(reqId, btnElement) {
    if(!confirm('Yakin ingin menyetujui request ini? Email barcode akan dikirim.')) return;
    btnElement.innerText = "Processing...";
    btnElement.disabled = true;

    // 1. Ubah tampilan layar secara INSTAN (tanpa nunggu server)
    let reqIndex = globalData.findIndex(r => r.Request_ID === reqId);
    if(reqIndex !== -1) {
        globalData[reqIndex].Status = 'Approved';
        applyFilter(); // Render ulang tabel dan summary detik itu juga!
    }

    // 2. Suruh server bekerja diam-diam di background (Fire and forget)
    try {
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'approve_request', 
                payload: { Request_ID: reqId, Manager_Email: localStorage.getItem('manager_email') } 
            })
        });
    } catch(err) {
        console.log("Proses background berjalan...");
    }
}

// ==========================================
// FUNGSI REJECT INSTAN (OPTIMISTIC UI)
// ==========================================
async function rejectRequest(reqId, btnElement) {
    if(!confirm('Yakin ingin me-reject request ini?')) return;
    btnElement.innerText = "Processing...";
    btnElement.disabled = true;

    // 1. Ubah tampilan layar secara INSTAN (tanpa nunggu server)
    let reqIndex = globalData.findIndex(r => r.Request_ID === reqId);
    if(reqIndex !== -1) {
        globalData[reqIndex].Status = 'Rejected';
        applyFilter(); // Tabel dan Summary langsung berubah!
    }

    // 2. Suruh server bekerja diam-diam di background
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

// Inisialisasi awal
fetchRequestsData();

// ==========================================
// FUNGSI EXPORT KE CSV
// ==========================================
function exportToCSV() {
    if (currentFilteredData.length === 0) {
        alert("Tidak ada data untuk di-export!");
        return;
    }

    // 1. Buat Header CSV
    let csvContent = "Request_ID,Nama,Perusahaan,Jadwal_Kunjungan,Gudang,Status\n";

    // 2. Masukkan isi data (Looping)
    currentFilteredData.forEach(req => {
        // Tanda kutip ditambahkan untuk mencegah error jika ada koma di nama perusahaan
        let name = `"${req.Name}"`;
        let company = `"${req.Company}"`;
        
        csvContent += `${req.Request_ID},${name},${company},${req.Visit_Date},${req.Warehouse_Code},${req.Status}\n`;
    });

    // 3. Buat File Virtual (Blob) dan Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Nama file otomatis menggunakan tanggal hari ini
    const todayDate = new Date().toISOString().slice(0,10);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_VWMS_${todayDate}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// AUTO REFRESH (LIVE TIME DASHBOARD)
// ==========================================
// Menarik data terbaru secara diam-diam setiap 15 detik (15000 ms)
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
            applyFilter(); // Render ulang tabel & summary (tidak merusak filter jika sedang aktif)
        }
    } catch(err) {
        // Jika internet tiba-tiba putus, biarkan saja agar tidak mengganggu user (silent error)
        console.log("Auto-refresh tertunda karena jaringan...");
    }
}