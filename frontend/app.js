 // URL API yang baru saja kamu buat
const API_URL = 'https://script.google.com/macros/s/AKfycbyiK14YKJqMPnmssIRupBqsh8i5yzdXqFDJdzvZLPrUYCDzgUA1btkomjns2vM2l_eQ7w/exec';

// Menangkap elemen DOM
const form = document.getElementById('visitorForm');
const categorySelect = document.getElementById('Category');
const deptContainer = document.getElementById('deptContainer');
const departmentInput = document.getElementById('Department');
const companyInput = document.getElementById('Company');
const submitBtn = document.getElementById('submitBtn');
const statusMessage = document.getElementById('statusMessage');

// Logika dinamis saat Kategori diubah
categorySelect.addEventListener('change', function() {
    if (this.value === 'Internal') {
        // Tampilkan Departemen, Set Company jadi Shipper & Readonly
        deptContainer.classList.remove('hidden');
        departmentInput.setAttribute('required', 'true');
        
        companyInput.value = 'Shipper';
        companyInput.setAttribute('readonly', 'true');
        companyInput.classList.add('bg-gray-100');
    } else {
        // Sembunyikan Departemen, Kosongkan Company & Bisa diisi
        deptContainer.classList.add('hidden');
        departmentInput.removeAttribute('required');
        departmentInput.value = '';
        
        companyInput.value = '';
        companyInput.removeAttribute('readonly');
        companyInput.classList.remove('bg-gray-100');
    }
});

// Proses Submit Form
form.addEventListener('submit', async function(e) {
    e.preventDefault(); // Mencegah form reload page

    // Ubah status tombol jadi loading
    submitBtn.innerHTML = 'Memproses...';
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

    // Kumpulkan data form
    const payloadData = {
        Name: document.getElementById('Name').value,
        Email: document.getElementById('Email').value,
        ID_Number: document.getElementById('ID_Number').value,
        Category: categorySelect.value,
        Department: departmentInput.value || '-', // Isi '-' jika kosong (eksternal)
        Company: companyInput.value,
        Visit_Date: document.getElementById('Visit_Date').value,
        Visit_Purpose: document.getElementById('Visit_Purpose').value,
        Warehouse_Code: document.getElementById('Warehouse_Code').value
    };

    // Bungkus sesuai format yang diminta backend API kita
    const requestBody = {
        action: 'submit_visitor',
        payload: payloadData
    };

    try {
        // Kirim ke Google Apps Script (Metode "no-cors" dan "POST" text plain untuk menghindari CORS blocking)
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        // Karena kita nembak GAS, kita anggap sukses jika request berhasil terkirim
        showMessage('Berhasil! Request visitor Anda sedang diproses.', 'success');
        form.reset();
        categorySelect.dispatchEvent(new Event('change')); // Reset UI kategori
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Terjadi kesalahan jaringan. Silakan coba lagi.', 'error');
    } finally {
        // Kembalikan tombol ke semula
        submitBtn.innerHTML = 'Submit Request';
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
});

// Fungsi untuk menampilkan pesan sukses/error
function showMessage(text, type) {
    statusMessage.textContent = text;
    statusMessage.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
    
    if (type === 'success') {
        statusMessage.classList.add('bg-green-100', 'text-green-700');
    } else {
        statusMessage.classList.add('bg-red-100', 'text-red-700');
    }
}