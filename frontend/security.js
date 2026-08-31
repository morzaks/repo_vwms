const API_URL = 'https://script.google.com/macros/s/AKfycbyiK14YKJqMPnmssIRupBqsh8i5yzdXqFDJdzvZLPrUYCDzgUA1btkomjns2vM2l_eQ7w/exec';

const loginSection = document.getElementById('loginSection');
const scannerSection = document.getElementById('scannerSection');
const resultCard = document.getElementById('resultCard');
let html5QrCode;
let currentScannedRequest = "";

// Cek Session
const secUsername = localStorage.getItem('sec_username');
const secWh = localStorage.getItem('sec_wh');

if(secUsername && secWh) {
    showScannerInterface();
}

// PROSES LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.innerText = "Checking...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'security_login', 
                payload: { Username: document.getElementById('username').value, Password: document.getElementById('password').value } 
            })
        });
        const result = await res.json();

        if(result.status === 'success') {
            localStorage.setItem('sec_username', result.data.username);
            localStorage.setItem('sec_wh', result.data.warehouse_code);
            window.location.reload();
        } else {
            const msg = document.getElementById('loginMessage');
            msg.textContent = result.message;
            msg.classList.remove('hidden');
            btn.innerText = "Login";
            btn.disabled = false;
        }
    } catch(err) {
        alert("Gagal koneksi server.");
        btn.innerText = "Login";
        btn.disabled = false;
    }
});

function showScannerInterface() {
    loginSection.classList.add('hidden');
    scannerSection.classList.remove('hidden');
    document.getElementById('secInfo').innerText = `${localStorage.getItem('sec_username')} (${localStorage.getItem('sec_wh')})`;
    startScanner();
}

// INIT SCANNER
function startScanner() {
    resultCard.classList.add('hidden');
    document.getElementById('rescanBtn').classList.add('hidden');
    
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, // Kamera belakang
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
    ).catch(err => alert("Kamera diblokir/tidak ditemukan."));
}

// KETIKA QR BERHASIL TERBACA
async function onScanSuccess(decodedText) {
    html5QrCode.stop(); // Hentikan kamera sementara nge-fetch API
    
    resultCard.classList.remove('hidden');
    document.getElementById('rescanBtn').classList.remove('hidden');
    document.getElementById('resStatus').innerText = "Memvalidasi Barcode...";
    document.getElementById('resStatus').className = "font-bold text-lg mb-2 text-yellow-400";
    document.getElementById('resMsg').innerText = "Tunggu sebentar...";
    document.getElementById('visitorDetails').classList.add('hidden');
    document.getElementById('checkInBtn').classList.add('hidden');

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'scan_qr', payload: { Request_ID: decodedText, Warehouse_Code: localStorage.getItem('sec_wh') } })
        });
        const result = await res.json();

        if(result.status === 'success') {
            // LULUS VALIDASI
            document.getElementById('resStatus').innerText = "VISITOR VALID";
            document.getElementById('resStatus').className = "font-bold text-xl mb-2 text-green-400";
            document.getElementById('resMsg').innerText = "Jadwal dan lokasi sesuai. Silakan Check In.";
            
            document.getElementById('visitorDetails').classList.remove('hidden');
            document.getElementById('vId').innerText = result.data.Request_ID;
            document.getElementById('vName').innerText = result.data.Name;
            document.getElementById('vKtp').innerText = result.data.ID_Number;
            document.getElementById('vCompany').innerText = result.data.Company;

            currentScannedRequest = result.data.Request_ID;
            document.getElementById('checkInBtn').classList.remove('hidden');
        } else {
            // DITOLAK
            document.getElementById('resStatus').innerText = "AKSES DITOLAK";
            document.getElementById('resStatus').className = "font-bold text-xl mb-2 text-red-500";
            document.getElementById('resMsg').innerText = result.message;
        }
    } catch(err) {
        document.getElementById('resStatus').innerText = "ERROR JARINGAN";
        document.getElementById('resMsg').innerText = "Gagal menghubungi server.";
    }
}

// EKSEKUSI CHECK IN
document.getElementById('checkInBtn').addEventListener('click', async () => {
    const btn = document.getElementById('checkInBtn');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'check_in', payload: { Request_ID: currentScannedRequest, Security_Username: localStorage.getItem('sec_username'), Warehouse_Code: localStorage.getItem('sec_wh') } })
        });
        const result = await res.json();

        if(result.status === 'success') {
            document.getElementById('resStatus').innerText = "BERHASIL CHECK IN!";
            btn.classList.add('hidden');
            document.getElementById('resMsg').innerText = result.message;
        } else {
            alert(result.message);
        }
    } catch(err) {
        alert("Gagal menghubungi server.");
    } finally {
        btn.innerText = "✅ CHECK IN VISITOR";
        btn.disabled = false;
    }
});

function resumeScanner() {
    startScanner();
}

function logout() {
    localStorage.clear();
    if(html5QrCode) html5QrCode.stop();
    window.location.reload();
}

// ==========================================
// FUNGSI MODAL EXPECTED VISITORS (TAMU HARI INI)
// ==========================================
function openExpectedModal() {
    document.getElementById('expectedModal').classList.remove('hidden');
    fetchExpectedVisitors();
    if(html5QrCode) html5QrCode.pause(); // Pause kamera saat modal terbuka biar hemat baterai
}

function closeExpectedModal() {
    document.getElementById('expectedModal').classList.add('hidden');
    if(html5QrCode) html5QrCode.resume(); // Lanjutkan kamera saat modal ditutup
}

async function fetchExpectedVisitors() {
    const listContainer = document.getElementById('expectedList');
    listContainer.innerHTML = '<p class="text-center text-slate-400 text-sm mt-4">Sedang memuat data dari server...</p>';

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'get_expected_visitors',
                payload: { Warehouse_Code: localStorage.getItem('sec_wh') }
            })
        });
        const result = await res.json();

        if(result.status === 'success') {
            listContainer.innerHTML = ''; // Kosongkan
            
            if(result.data.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center p-6 bg-slate-700 rounded-lg">
                        <span class="text-4xl mb-2 block">📭</span>
                        <p class="text-slate-300 text-sm font-medium">Tidak ada tamu yang dijadwalkan hari ini.</p>
                    </div>`;
                return;
            }

            // Looping data tamu
            result.data.forEach(visitor => {
                const div = document.createElement('div');
                div.className = "bg-slate-700 p-3 rounded-lg border-l-4 border-blue-500 shadow-md";
                div.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <p class="font-bold text-white text-base">${visitor.Name}</p>
                        <span class="bg-blue-900 text-blue-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Approved</span>
                    </div>
                    <p class="text-sm text-slate-300 mb-1">PT. ${visitor.Company}</p>
                    <p class="text-xs text-slate-400 font-mono">${visitor.Request_ID}</p>
                `;
                listContainer.appendChild(div);
            });
        } else {
            listContainer.innerHTML = `<p class="text-center text-red-400 text-sm mt-4">${result.message}</p>`;
        }
    } catch(err) {
        listContainer.innerHTML = '<p class="text-center text-red-400 text-sm mt-4">Gagal terhubung ke jaringan.</p>';
    }
}