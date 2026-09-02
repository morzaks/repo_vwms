const API_URL = 'https://script.google.com/macros/s/AKfycbyiK14YKJqMPnmssIRupBqsh8i5yzdXqFDJdzvZLPrUYCDzgUA1btkomjns2vM2l_eQ7w/exec';

const form = document.getElementById('visitorForm');
const categorySelect = document.getElementById('Category');
const deptContainer = document.getElementById('deptContainer');
const departmentInput = document.getElementById('Department');
const companyInput = document.getElementById('Company');
const submitBtn = document.getElementById('submitBtn');

let whSelectInstance; // Menyimpan instance dropdown searchable

categorySelect.addEventListener('change', function() {
    if (this.value === 'Internal') {
        deptContainer.classList.remove('hidden');
        departmentInput.setAttribute('required', 'true');
        companyInput.value = 'Shipper';
        companyInput.setAttribute('readonly', 'true');
        companyInput.classList.add('bg-gray-100');
    } else {
        deptContainer.classList.add('hidden');
        departmentInput.removeAttribute('required');
        departmentInput.value = '';
        companyInput.value = '';
        companyInput.removeAttribute('readonly');
        companyInput.classList.remove('bg-gray-100');
    }
});

form.addEventListener('submit', async function(e) {
    e.preventDefault(); 
    submitBtn.innerHTML = 'Memproses...';
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

    const payloadData = {
        Name: document.getElementById('Name').value,
        Email: document.getElementById('Email').value,
        ID_Number: document.getElementById('ID_Number').value,
        Category: categorySelect.value,
        Department: departmentInput.value || '-', 
        Company: companyInput.value,
        Visit_Date: document.getElementById('Visit_Date').value,
        Visit_Purpose: document.getElementById('Visit_Purpose').value,
        Warehouse_Code: document.getElementById('Warehouse_Code').value
    };

    const requestBody = {
        action: 'submit_visitor',
        payload: payloadData
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        // Munculkan Modal Sukses
        document.getElementById('successModal').classList.remove('hidden');
        
        // Reset form
        form.reset();
        categorySelect.dispatchEvent(new Event('change')); 
        if (whSelectInstance) whSelectInstance.clear(); // Bersihkan dropdown pencarian
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
        submitBtn.innerHTML = 'Submit Request';
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
});

// Fungsi untuk menutup modal
function closeModal() {
    document.getElementById('successModal').classList.add('hidden');
}

async function loadWarehouses() {
    const whSelect = document.getElementById('Warehouse_Code');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_warehouses' })
        });
        const result = await response.json();

        if(result.status === 'success') {
            whSelect.innerHTML = '<option value="">Ketik untuk mencari gudang...</option>'; 
            
            result.data.forEach(wh => {
                const option = document.createElement('option');
                option.value = wh.code;
                option.textContent = `${wh.code} (${wh.name})`; 
                whSelect.appendChild(option);
            });

            // Ubah dropdown biasa menjadi Searchable Dropdown
            whSelectInstance = new TomSelect("#Warehouse_Code", {
                create: false,
                sortField: {
                    field: "text",
                    direction: "asc"
                }
            });

        } else {
            whSelect.innerHTML = '<option value="">Gagal memuat data dari server</option>';
        }
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        whSelect.innerHTML = '<option value="">Terjadi kesalahan jaringan</option>';
    }
}

loadWarehouses();