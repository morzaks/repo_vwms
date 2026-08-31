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