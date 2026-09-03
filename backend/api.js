const SPREADSHEET_ID = '11kKHKzOSc4IygRvkmiKrj76Yd4aoacCYRplIeQI4sgU';

function doPost(e) {
  try {
    let data = JSON.parse(e.postData.contents);
    let action = data.action;

    if (action === "submit_visitor") return handleVisitorSubmit(data.payload);
    else if (action === "request_otp") return handleRequestOtp(data.payload);
    else if (action === "verify_otp") return handleVerifyOtp(data.payload);
    else if (action === "get_all_requests") return handleGetAllRequests(data.payload); 
    else if (action === "approve_request") return handleApproveRequest(data.payload);
    else if (action === "reject_request") return handleRejectRequest(data.payload);
    else if (action === "get_warehouses") return handleGetWarehouses();
    // ROUTING BARU UNTUK SECURITY APP
    else if (action === "security_login") return handleSecurityLogin(data.payload);
    else if (action === "security_register") return handleSecurityRegister(data.payload);
    else if (action === "add_account") return handleAddAccount(data.payload);
    else if (action === "scan_qr") return handleScanQR(data.payload);
    else if (action === "check_in") return handleCheckIn(data.payload);
    else if (action === "get_expected_visitors") return handleGetExpectedVisitors(data.payload);

    return createJsonResponse({ status: 'error', message: 'Action not found' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function handleVisitorSubmit(payload) {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");
  let timestamp = new Date();
  let requestId = "REQ-" + Utilities.formatDate(timestamp, "GMT+7", "yyyyMMddHHmmss");
  let rowData = [
    requestId, timestamp, payload.Name, payload.Email, payload.ID_Number,
    payload.Category, payload.Department, payload.Company, payload.Visit_Date,
    payload.Visit_Purpose, payload.Warehouse_Code, "Pending"
  ];
  sheet.appendRow(rowData);
  return createJsonResponse({ status: 'success', message: 'Visitor request submitted successfully', data: { request_id: requestId } });
}

function handleRequestOtp(payload) {
  let email = payload.Email;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let accountSheet = ss.getSheetByName("Master_Account");
  let data = accountSheet.getDataRange().getValues();
  let isManager = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email && (data[i][2] === "Manager" || data[i][2] === "Manager_All")) {
      isManager = true; break;
    }
  }
  if (!isManager) return createJsonResponse({ status: 'error', message: 'Email tidak terdaftar sebagai Manager' });
  let otp = Math.floor(100000 + Math.random() * 900000).toString();
  let otpSheet = ss.getSheetByName("Auth_OTP");
  otpSheet.appendRow([email, otp, new Date(new Date().getTime() + 10 * 60000), "Active"]);
  GmailApp.sendEmail(email, "[VWMS] OTP Login Manager", "Kode OTP Anda: " + otp);
  return createJsonResponse({ status: 'success', message: 'OTP terkirim ke email' });
}

function handleVerifyOtp(payload) {
  let email = payload.Email;
  let otpInput = payload.OTP;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let otpSheet = ss.getSheetByName("Auth_OTP");
  let data = otpSheet.getDataRange().getValues();
  let valid = false, rowIndex = -1, now = new Date();
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][0] === email && data[i][1].toString() === otpInput.toString() && data[i][3] === "Active") {
      if (now <= new Date(data[i][2])) { valid = true; rowIndex = i + 1; break; }
    }
  }
  if (valid) {
    otpSheet.getRange(rowIndex, 4).setValue("Used");
    return createJsonResponse({ status: 'success', message: 'Login berhasil' });
  } else return createJsonResponse({ status: 'error', message: 'OTP tidak valid / kedaluwarsa' });
}

function handleApproveRequest(payload) {
  let reqId = payload.Request_ID;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");
  let data = sheet.getDataRange().getValues();
  let rowIndex = -1, visitorEmail = "", visitorName = "", whCode = "", visitDate = "";
  
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === reqId) { 
        rowIndex = i + 1; visitorName = data[i][2]; visitorEmail = data[i][3]; 
        whCode = data[i][10]; visitDate = Utilities.formatDate(new Date(data[i][8]), "GMT+7", "dd MMM yyyy");
        break; 
    }
  }
  if(rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Request tidak ditemukan' });
  
  sheet.getRange(rowIndex, 12).setValue("Approved");
  let qrUrl = "https://quickchart.io/qr?text=" + reqId + "&size=300";
  
  let htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #000;">Halo Selamat Datang di Warehouse Shipper</h2>
        <p><b>Warehouse Code:</b> ${whCode}</p>
        <p>Hai <b>${visitorName}</b>,</p>
        <p>Demi menjaga kenyamanan dan keamanan semua pihak, untuk memasuki area <b>Warehouse Shipper (${whCode})</b>, setiap visitor diwajibkan menunjukkan barcode visitor sebagai tanda pengenal.</p>
        <p style="font-style: italic; color: #555;">To ensure safety and convenience for all parties, all visitors entering the <b>Shipper Warehouse (${whCode})</b> are required to present a visitor barcode as an identification pass.</p>
        <p><b>QR Code berikut dapat dipindai oleh petugas Security sebagai bukti akses masuk ke area warehouse.</b></p>
        <p><b>Masa berlaku barcode:</b> ${visitDate}</p>
        <div style="margin: 20px 0;">
            <a href="${qrUrl}" download="Barcode_${reqId}.png">
                <img src="${qrUrl}" alt="QR Code" style="width: 250px; height: 250px; border: 1px solid #ddd;"/>
            </a>
        </div>
        <p style="font-size: 12px; font-style: italic;">*Barcode hanya berlaku pada tanggal yang tertera.</p>
        <p>Terima kasih atas kepercayaan dan dukungan Anda.<br>Kami menantikan kunjungan Anda!</p>
    </div>`;
  
  GmailApp.sendEmail(visitorEmail, "Barcode Visitor Warehouse Shipper - " + reqId, "Mode HTML diperlukan.", {htmlBody: htmlBody});
  return createJsonResponse({ status: 'success', message: 'Approved! Email & Barcode telah dikirim.' });
}

function handleGetAllRequests(payload) {
  let email = payload.Manager_Email;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let accData = ss.getSheetByName("Master_Account").getDataRange().getValues();
  let role = "";
  for (let i = 1; i < accData.length; i++) { if (accData[i][0] === email) { role = accData[i][2]; break; } }
  if (!role) return createJsonResponse({ status: 'error', message: 'Akses ditolak' });

  let allowedWH = [];
  if (role === "Manager") {
    let whData = ss.getSheetByName("Account_Warehouse").getDataRange().getValues();
    for (let i = 1; i < whData.length; i++) { if (whData[i][0] === email) allowedWH.push(whData[i][1]); }
  }

  let data = ss.getSheetByName("Visitor_Request").getDataRange().getValues();
  let allData = [];
  for(let i=1; i<data.length; i++) {
    let whCode = data[i][10], status = data[i][11];
    let hasAccess = (role === "Manager_All") || (role === "Manager" && allowedWH.includes(whCode));
    
    // TAMBAHAN: Memasukkan status Rejected agar tidak hilang dari dashboard
    if(hasAccess && (status === "Pending" || status === "Approved" || status === "Checked-In" || status === "Rejected" || status === "Rejected (Auto)")) { 
      allData.push({
        Request_ID: data[i][0], Name: data[i][2], Company: data[i][7],
        Raw_Date: new Date(data[i][8]).toISOString(), 
        Visit_Date: Utilities.formatDate(new Date(data[i][8]), "GMT+7", "dd MMM yyyy"), 
        Warehouse_Code: whCode, Status: status
      });
    }
  }
  return createJsonResponse({ status: 'success', data: allData.reverse() }); 
}

function handleRejectRequest(payload) {
  let reqId = payload.Request_ID;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");
  let data = sheet.getDataRange().getValues();
  
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === reqId) { 
      sheet.getRange(i + 1, 12).setValue("Rejected");
      return createJsonResponse({ status: 'success', message: 'Request ditolak' });
    }
  }
  return createJsonResponse({ status: 'error', message: 'Request tidak ditemukan' });
}

function handleGetWarehouses() {
  let data = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Master_Warehouse").getDataRange().getValues();
  let warehouses = [];
  for (let i = 1; i < data.length; i++) { if(data[i][0]) warehouses.push({ code: data[i][0], name: data[i][1] }); }
  return createJsonResponse({ status: 'success', data: warehouses });
}

// ==========================================
// FUNGSI SECURITY APP (BARU)
// ==========================================
function handleSecurityLogin(payload) {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let accData = ss.getSheetByName("Master_Account").getDataRange().getValues();
  let valid = false, username = payload.Username, whCode = "";
  
  for(let i=1; i<accData.length; i++) {
    if(accData[i][0] === username && accData[i][1] === payload.Password && accData[i][2] === "Security") {
      valid = true; break;
    }
  }
  if(!valid) return createJsonResponse({ status: 'error', message: 'Username atau Password salah!' });
  
  let whData = ss.getSheetByName("Account_Warehouse").getDataRange().getValues();
  for(let i=1; i<whData.length; i++) {
    if(whData[i][0] === username) { whCode = whData[i][1]; break; }
  }
  if(!whCode) return createJsonResponse({ status: 'error', message: 'Akun belum bisa digunakan karena akun belum di-assign ke warehouse tujuan, harap hubungi admin.' });
  
  return createJsonResponse({ status: 'success', data: { username: username, warehouse_code: whCode } });
}

function handleScanQR(payload) {
  let reqId = payload.Request_ID, secWh = payload.Warehouse_Code;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let data = ss.getSheetByName("Visitor_Request").getDataRange().getValues();
  let reqData = null;
  
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === reqId) {
      // Menambahkan ID_Number: data[i][4] ke dalam reqData
        reqData = { 
            Request_ID: data[i][0], Name: data[i][2], ID_Number: data[i][4], 
            Company: data[i][7], Visit_Date: data[i][8], Visit_Purpose: data[i][9], // INI TAMBAHANNYA
            Warehouse_Code: data[i][10], Status: data[i][11] 
        };
      break;
    }
  }
  if(!reqData) return createJsonResponse({ status: 'error', message: 'Barcode tidak valid / Request tidak ditemukan' });
  
  // LOGIKA VALIDASI
  if(reqData.Warehouse_Code !== secWh) return createJsonResponse({ status: 'error', message: `Salah lokasi! Visitor ini untuk gudang ${reqData.Warehouse_Code}` });
  if(reqData.Status === "Pending") return createJsonResponse({ status: 'error', message: 'Ditolak: Request ini belum di-Approve oleh Manager.' });
  if(reqData.Status === "Checked-In") return createJsonResponse({ status: 'error', message: 'Ditolak: Visitor ini sudah melakukan Check-In sebelumnya.' });
  
  let visitDateStr = Utilities.formatDate(new Date(reqData.Visit_Date), "GMT+7", "yyyy-MM-dd");
  let todayStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  
  if(visitDateStr !== todayStr) {
    let tglAsli = Utilities.formatDate(new Date(reqData.Visit_Date), "GMT+7", "dd MMM yyyy");
    return createJsonResponse({ status: 'error', message: `Ditolak: Jadwal kunjungan salah (Seharusnya: ${tglAsli})` });
  }
  
  reqData.Visit_Date = Utilities.formatDate(new Date(reqData.Visit_Date), "GMT+7", "dd MMM yyyy");
  return createJsonResponse({ status: 'success', data: reqData });
}

function handleCheckIn(payload) {
  let reqId = payload.Request_ID, secUsername = payload.Security_Username, secWh = payload.Warehouse_Code;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");
  let data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === reqId) { rowIndex = i + 1; break; }
  }
  if(rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Request tidak ditemukan' });
  
  // Update status Checked-In
  sheet.getRange(rowIndex, 12).setValue("Checked-In");
  
  // Insert Log
  let timestamp = new Date();
  let scanId = "SCAN-" + Utilities.formatDate(timestamp, "GMT+7", "yyyyMMddHHmmss");
  ss.getSheetByName("Visitor_Scan_Log").appendRow([scanId, reqId, secUsername, secWh, timestamp, "Check-In Success"]);
  
  return createJsonResponse({ status: 'success', message: 'Check-In Berhasil disimpan!' });
}

function createJsonResponse(responseObject) { return ContentService.createTextOutput(JSON.stringify(responseObject)).setMimeType(ContentService.MimeType.JSON); }

// --- FUNGSI BARU: DAFTAR TAMU HARI INI UNTUK SECURITY ---
function handleGetExpectedVisitors(payload) {
  let secWh = payload.Warehouse_Code;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let data = ss.getSheetByName("Visitor_Request").getDataRange().getValues();
  
  // Format hari ini untuk dicocokkan
  let todayStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  let expectedList = [];

  for(let i=1; i<data.length; i++) {
    let reqWh = data[i][10];
    let status = data[i][11];
    let visitDateStr = Utilities.formatDate(new Date(data[i][8]), "GMT+7", "yyyy-MM-dd");

    // Jika Gudang cocok, Status Approved, dan Tanggal Kunjungan adalah Hari Ini
    if(reqWh === secWh && status === "Approved" && visitDateStr === todayStr) {
      expectedList.push({
        Request_ID: data[i][0],
        Name: data[i][2],
        Company: data[i][7]
      });
    }
  }
  return createJsonResponse({ status: 'success', data: expectedList });
}

// ==========================================
// FUNGSI CRON JOB: AUTO-REJECT EXPIRED REQUESTS
// ==========================================
function autoRejectExpiredRequests() {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");
  let data = sheet.getDataRange().getValues();
  
  // Set waktu hari ini ke jam 00:00:00 untuk perbandingan yang akurat
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  // Looping mulai dari baris 2 (index 1)
  for (let i = 1; i < data.length; i++) {
    let status = data[i][11];
    let visitDate = new Date(data[i][8]);
    visitDate.setHours(0, 0, 0, 0);

    // Jika status masih Pending DAN tanggal kunjungannya sudah terlewat
    if (status === "Pending" && visitDate < today) {
      // Ubah status di Spreadsheet menjadi Rejected (Auto)
      sheet.getRange(i + 1, 12).setValue("Rejected (Auto)");
    }
  }
}

// ==========================================
// FUNGSI REGISTER SECURITY (BARU)
// ==========================================
function handleSecurityRegister(payload) {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let accSheet = ss.getSheetByName("Master_Account");
  let data = accSheet.getDataRange().getValues();
  let username = payload.Username;
  
  // 1. Cek apakah username sudah dipakai
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      return createJsonResponse({ status: 'error', message: 'Username sudah terdaftar. Silakan gunakan username lain.' });
    }
  }
  
  // 2. Simpan ke sheet Master_Account dengan Role "Security"
  accSheet.appendRow([username, payload.Password, "Security"]);
  
  // Catatan: Kita TIDAK menyimpan ke Account_Warehouse di sini, agar Admin yang menentukan.
  return createJsonResponse({ status: 'success', message: 'Registrasi berhasil! Silakan hubungi Admin untuk assign gudang sebelum login.' });
}

// ==========================================
// FUNGSI TAMBAH AKUN (KHUSUS MANAGER_ALL)
// ==========================================
function handleAddAccount(payload) {
  let executorEmail = payload.Executor_Email;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let accSheet = ss.getSheetByName("Master_Account");
  let accData = accSheet.getDataRange().getValues();

  // 1. Validasi: Pastikan yang mengeksekusi adalah Manager_All
  let isManagerAll = false;
  for(let i=1; i<accData.length; i++) {
    if(accData[i][0] === executorEmail && accData[i][2] === "Manager_All") {
      isManagerAll = true; break;
    }
  }
  if(!isManagerAll) return createJsonResponse({status: 'error', message: 'Akses Ditolak! Hanya Manager_All yang dapat menambah akun baru.'});

  // 2. Cek apakah Username/Email sudah ada
  for(let i=1; i<accData.length; i++) {
    if(accData[i][0] === payload.Username_Email) {
      return createJsonResponse({status: 'error', message: 'Username atau Email tersebut sudah terdaftar.'});
    }
  }

  // 3. Simpan ke sheet Master_Account (Format: Email/Username, Password, Role)
  accSheet.appendRow([payload.Username_Email, payload.Password || "", payload.Role]);

  // 4. Jika ada input Gudang dan Rolenya bukan Manager_All, simpan ke Account_Warehouse
  if(payload.Warehouse && payload.Role !== "Manager_All") {
     let whSheet = ss.getSheetByName("Account_Warehouse");
     whSheet.appendRow([payload.Username_Email, payload.Warehouse]);
  }

  return createJsonResponse({status: 'success', message: 'Akun berhasil ditambahkan!'});
}