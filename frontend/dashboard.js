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

// FUNGSI RENDER SUMMARY CARDS
function renderSummaryCards(data) {
    const container = document.getElementById('summaryCards');
    container.innerHTML = ''; // Kosongkan

    // Hitung akumulasi per gudang
    let summary = {};
    data.forEach(req => {
        let wh = req.Warehouse_Code;
        if (!summary[wh]) summary[wh] = { total: 0, pending: 0, approved: 0 };
        
        summary[wh].total++;
        if (req.Status === 'Pending') summary[wh].pending++;
        if (req.Status === 'Approved') summary[wh].approved++;
    });

    if (Object.keys(summary).length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-lg shadow text-center text-slate-500 col-span-full">Tidak ada data kunjungan pada periode ini.</div>`;
        return;
    }

    // Buat HTML Card
    for (let wh in summary) {
        let s = summary[wh];
        let card = document.createElement('div');
        card.className = "bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-600";
        card.innerHTML = `
            <h3 class="text-xl font-bold text-slate-800 mb-4">${wh}</h3>
            <div class="flex justify-between items-center mb-2 border-b pb-2">
                <span class="text-sm font-medium text-slate-500">Total Request</span>
                <span class="text-lg font-bold text-blue-600">${s.total}</span>
            </div>
            <div class="flex justify-between items-center mb-2 border-b pb-2">
                <span class="text-sm font-medium text-yellow-600">Menunggu Approval</span>
                <span class="font-bold text-yellow-600">${s.pending}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-green-600">Disetujui</span>
                <span class="font-bold text-green-600">${s.approved}</span>
            </div>
        `;
        container.appendChild(card);
    }
}

// FUNGSI RENDER TABEL (Menyesuaikan data yg di-filter)
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ''; 

    if (data.length > 0) {
        data.forEach(req => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition";
            
            let statusBadge = '';
            let actionBtn = '';

            // Penentuan Badge dan Tombol berdasarkan Status
            if (req.Status === 'Approved') {
                statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Approved</span>';
                actionBtn = `<button disabled class="bg-slate-200 text-slate-400 text-sm font-semibold py-1.5 px-4 rounded cursor-not-allowed">Done</button>`;
            } else if (req.Status === 'Checked-In') {
                statusBadge = '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Checked-In</span>';
                actionBtn = `<button disabled class="bg-slate-200 text-slate-400 text-sm font-semibold py-1.5 px-4 rounded cursor-not-allowed">Di Lokasi</button>`;
            } else { // Jika Pending
                statusBadge = '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Pending</span>';
                actionBtn = `<button onclick="approveRequest('${req.Request_ID}', this)" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-4 rounded shadow transition">Approve</button>`;
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

async function approveRequest(reqId, btnElement) {
    if(!confirm(`Yakin ingin menyetujui request ${reqId}?`)) return;
    btnElement.innerText = "Processing...";
    btnElement.disabled = true;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'approve_request', payload: { Request_ID: reqId, Manager_Email: managerEmail } })
        });
        const result = await response.json();
        
        if(result.status === 'success') {
            alert(result.message);
            fetchRequestsData(); // Ambil ulang data segar dari server setelah approve
        } else {
            alert("Gagal: " + result.message);
            fetchRequestsData(); // Reset UI
        }
    } catch(error) {
        alert("Terjadi kesalahan jaringan.");
        fetchRequestsData(); // Reset UI
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