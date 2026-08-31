// Gunakan Web App URL kamu yang tadi
const API_URL = 'https://script.google.com/macros/s/AKfycbyiK14YKJqMPnmssIRupBqsh8i5yzdXqFDJdzvZLPrUYCDzgUA1btkomjns2vM2l_eQ7w/exec';

const emailForm = document.getElementById('emailForm');
const otpForm = document.getElementById('otpForm');
const requestOtpBtn = document.getElementById('requestOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const statusMessage = document.getElementById('statusMessage');

let currentEmail = '';

// Step 1: Request OTP
emailForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    currentEmail = document.getElementById('Email').value;
    
    requestOtpBtn.innerHTML = 'Mengirim...';
    requestOtpBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'request_otp', payload: { Email: currentEmail } })
        });
        
        const result = await response.json();
        
        if(result.status === 'success') {
            showMessage(result.message, 'success');
            emailForm.classList.add('hidden'); // Sembunyikan form email
            otpForm.classList.remove('hidden'); // Munculkan form OTP
        } else {
            showMessage(result.message, 'error');
            requestOtpBtn.innerHTML = 'Kirim OTP';
            requestOtpBtn.disabled = false;
        }
    } catch (error) {
        showMessage('Terjadi kesalahan jaringan.', 'error');
        requestOtpBtn.innerHTML = 'Kirim OTP';
        requestOtpBtn.disabled = false;
    }
});

// Step 2: Verify OTP
otpForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const otpValue = document.getElementById('OTP').value;
    
    verifyOtpBtn.innerHTML = 'Memverifikasi...';
    verifyOtpBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'verify_otp', payload: { Email: currentEmail, OTP: otpValue } })
        });
        
        const result = await response.json();
        
        if(result.status === 'success') {
            showMessage('Login sukses! Mengalihkan...', 'success');
            // Simpan session sederhana di localStorage
            localStorage.setItem('manager_email', currentEmail);
            
            // Redirect ke dashboard manager (akan kita buat di Langkah B)
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showMessage(result.message, 'error');
            verifyOtpBtn.innerHTML = 'Verifikasi & Login';
            verifyOtpBtn.disabled = false;
        }
    } catch (error) {
        showMessage('Terjadi kesalahan jaringan.', 'error');
        verifyOtpBtn.innerHTML = 'Verifikasi & Login';
        verifyOtpBtn.disabled = false;
    }
});

function showMessage(text, type) {
    statusMessage.textContent = text;
    statusMessage.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
    if (type === 'success') {
        statusMessage.classList.add('bg-green-100', 'text-green-700');
    } else {
        statusMessage.classList.add('bg-red-100', 'text-red-700');
    }
}