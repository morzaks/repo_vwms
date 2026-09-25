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
    else if (action === "get_options") return handleGetOptions(); // ROUTING BARU UNTUK DROPDOWN
    
    // ROUTING UNTUK SECURITY APP
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
  
  // Kalkulasi End_Date
  let startDateObj = new Date(payload.Start_Date);
  let durationDays = parseInt(payload.Visit_Duration) || 1; 
  startDateObj.setDate(startDateObj.getDate() + (durationDays - 1));
  let endDateStr = Utilities.formatDate(startDateObj, "GMT+7", "yyyy-MM-dd");

  // Format array: A (ReqID) sampai N (Visitor_Role)
  let rowData = [
    requestId, timestamp, payload.Name, payload.Email, payload.ID_Number,
    payload.Category, payload.Department, payload.Company, payload.Start_Date,
    payload.Visit_Purpose, payload.Warehouse_Code, "Pending", endDateStr, ""
  ];
  sheet.appendRow(rowData);
  return createJsonResponse({ status: 'success', message: 'Visitor request submitted successfully', data: { request_id: requestId, end_date: endDateStr } });
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
  let visitorRole = payload.Visitor_Role || "Eksternal non Client - Perlu Cek"; // Default fallback
  
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");
  let data = sheet.getDataRange().getValues();
  let rowIndex = -1, visitorEmail = "", visitorName = "", whCode = "", startDate = "", endDate = "";
  
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === reqId) { 
        rowIndex = i + 1; visitorName = data[i][2]; visitorEmail = data[i][3]; 
        whCode = data[i][10]; 
        startDate = Utilities.formatDate(new Date(data[i][8]), "GMT+7", "dd MMM yyyy");
        endDate = Utilities.formatDate(new Date(data[i][12]), "GMT+7", "dd MMM yyyy");
        break; 
    }
  }
  if(rowIndex === -1) return createJsonResponse({ status: 'error', message: 'Request tidak ditemukan' });
  
  sheet.getRange(rowIndex, 12).setValue("Approved"); // Col L
  sheet.getRange(rowIndex, 14).setValue(visitorRole); // Col N (Visitor Role)
  
  let qrUrl = "https://quickchart.io/qr?text=" + reqId + "&size=300";
  let masaBerlaku = startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;
  
  let htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #000;">Halo Selamat Datang di Warehouse Shipper</h2>
        <p><b>Warehouse Code:</b> ${whCode}</p>
        <p>Hai <b>${visitorName}</b>,</p>
        <p>Demi menjaga kenyamanan dan keamanan semua pihak, untuk memasuki area <b>Warehouse Shipper (${whCode})</b>, setiap visitor diwajibkan menunjukkan barcode visitor sebagai tanda pengenal.</p>
        <p style="font-style: italic; color: #555;">To ensure safety and convenience for all parties, all visitors entering the <b>Shipper Warehouse (${whCode})</b> are required to present a visitor barcode as an identification pass.</p>
        <p><b>QR Code berikut dapat dipindai oleh petugas Security sebagai bukti akses masuk ke area warehouse.</b></p>
        <p><b>Masa berlaku barcode:</b> ${masaBerlaku}</p>
        <p><b>Kategori Akses:</b> ${visitorRole}</p>
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
    
    if(hasAccess && (status === "Pending" || status === "Approved" || status === "Checked-In" || status === "Rejected" || status === "Rejected (Auto)")) { 
      allData.push({
        Request_ID: data[i][0], Name: data[i][2], Company: data[i][7],
        Start_Date: Utilities.formatDate(new Date(data[i][8]), "GMT+7", "dd MMM yyyy"), 
        End_Date: Utilities.formatDate(new Date(data[i][12]), "GMT+7", "dd MMM yyyy"), 
        Warehouse_Code: whCode, Status: status, Visitor_Role: data[i][13]
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

// FUNGSI BARU: AMBIL OPTION UNTUK DROPDOWN ROLE
function handleGetOptions() {
  let data = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Master_Option").getDataRange().getValues();
  let roles = [];
  for (let i = 1; i < data.length; i++) { 
    if(data[i][0] === "Visitor_Role" && data[i][1]) roles.push(data[i][1]); 
  }
  return createJsonResponse({ status: 'success', data: roles });
}

// ==========================================
// FUNGSI SECURITY APP
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
  if(!whCode) return createJsonResponse({ status: 'error', message: 'Akun belum di-assign ke warehouse tujuan.' });
  
  return createJsonResponse({ status: 'success', data: { username: username, warehouse_code: whCode } });
}

function handleScanQR(payload) {
  let reqId = payload.Request_ID, secWh = payload.Warehouse_Code;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let data = ss.getSheetByName("Visitor_Request").getDataRange().getValues();
  let reqData = null;
  
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === reqId) {
        reqData = { 
            Request_ID: data[i][0], Name: data[i][2], ID_Number: data[i][4], 
            Company: data[i][7], Start_Date: data[i][8], Visit_Purpose: data[i][9], 
            Warehouse_Code: data[i][10], Status: data[i][11], End_Date: data[i][12], Visitor_Role: data[i][13]
        };
      break;
    }
  }
  if(!reqData) return createJsonResponse({ status: 'error', message: 'Barcode tidak valid / Request tidak ditemukan' });
  
  if(reqData.Warehouse_Code !== secWh) return createJsonResponse({ status: 'error', message: `Salah lokasi! Visitor ini untuk gudang ${reqData.Warehouse_Code}` });
  if(reqData.Status === "Pending") return createJsonResponse({ status: 'error', message: 'Ditolak: Request ini belum di-Approve.' });
  if(reqData.Status === "Checked-In") return createJsonResponse({ status: 'error', message: 'Ditolak: Visitor sudah Check-In.' });
  
  // Validasi Range Tanggal
  let today = new Date(); today.setHours(0,0,0,0);
  let startObj = new Date(reqData.Start_Date); startObj.setHours(0,0,0,0);
  let endObj = new Date(reqData.End_Date); endObj.setHours(0,0,0,0);
  
  if(today < startObj || today > endObj) {
    let tglMulai = Utilities.formatDate(startObj, "GMT+7", "dd MMM yyyy");
    let tglSelesai = Utilities.formatDate(endObj, "GMT+7", "dd MMM yyyy");
    let rangeText = tglMulai === tglSelesai ? tglMulai : `${tglMulai} s/d ${tglSelesai}`;
    return createJsonResponse({ status: 'error', message: `Ditolak: Di luar jadwal kunjungan (${rangeText})` });
  }
  
  reqData.Masa_Berlaku = (startObj.getTime() === endObj.getTime()) ? Utilities.formatDate(startObj, "GMT+7", "dd MMM yyyy") : `${Utilities.formatDate(startObj, "GMT+7", "dd MMM yyyy")} s/d ${Utilities.formatDate(endObj, "GMT+7", "dd MMM yyyy")}`;
  
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
  
  sheet.getRange(rowIndex, 12).setValue("Checked-In");
  
  let timestamp = new Date();
  let scanId = "SCAN-" + Utilities.formatDate(timestamp, "GMT+7", "yyyyMMddHHmmss");
  ss.getSheetByName("Visitor_Scan_Log").appendRow([scanId, reqId, secUsername, secWh, timestamp, "Check-In Success"]);
  
  return createJsonResponse({ status: 'success', message: 'Check-In Berhasil disimpan!' });
}

function handleGetExpectedVisitors(payload) {
  let secWh = payload.Warehouse_Code;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let data = ss.getSheetByName("Visitor_Request").getDataRange().getValues();
  
  let today = new Date(); today.setHours(0,0,0,0);
  let expectedList = [];

  for(let i=1; i<data.length; i++) {
    let reqWh = data[i][10];
    let status = data[i][11];
    
    // Cek apakah data ini valid (punya start & end date)
    if(data[i][8] && data[i][12]) {
        let startObj = new Date(data[i][8]); startObj.setHours(0,0,0,0);
        let endObj = new Date(data[i][12]); endObj.setHours(0,0,0,0);

        // Jika Gudang cocok, Status Approved, dan HARI INI berada di antara Start dan End
        if(reqWh === secWh && status === "Approved" && today >= startObj && today <= endObj) {
          expectedList.push({ Request_ID: data[i][0], Name: data[i][2], Company: data[i][7] });
        }
    }
  }
  return createJsonResponse({ status: 'success', data: expectedList });
}

function autoRejectExpiredRequests() {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");
  let data = sheet.getDataRange().getValues();
  
  let today = new Date(); today.setHours(0, 0, 0, 0);

  for (let i = 1; i < data.length; i++) {
    let status = data[i][11];
    if(data[i][12]) {
        let endDate = new Date(data[i][12]);
        endDate.setHours(0, 0, 0, 0);

        // Expired jika End_Date sudah lewat
        if (status === "Pending" && endDate < today) {
          sheet.getRange(i + 1, 12).setValue("Rejected (Auto)");
        }
    }
  }
}

function handleSecurityRegister(payload) {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let accSheet = ss.getSheetByName("Master_Account");
  let data = accSheet.getDataRange().getValues();
  let username = payload.Username;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) return createJsonResponse({ status: 'error', message: 'Username sudah terdaftar.' });
  }
  
  accSheet.appendRow([username, payload.Password, "Security"]);
  return createJsonResponse({ status: 'success', message: 'Registrasi berhasil! Hubungi Admin untuk assign gudang.' });
}

function handleAddAccount(payload) {
  let executorEmail = payload.Executor_Email;
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let accSheet = ss.getSheetByName("Master_Account");
  let accData = accSheet.getDataRange().getValues();

  let isManagerAll = false;
  for(let i=1; i<accData.length; i++) {
    if(accData[i][0] === executorEmail && accData[i][2] === "Manager_All") {
      isManagerAll = true; break;
    }
  }
  if(!isManagerAll) return createJsonResponse({status: 'error', message: 'Akses Ditolak!'});

  for(let i=1; i<accData.length; i++) {
    if(accData[i][0] === payload.Username_Email) return createJsonResponse({status: 'error', message: 'Akun sudah terdaftar.'});
  }

  accSheet.appendRow([payload.Username_Email, payload.Password || "", payload.Role]);

  if(payload.Warehouse && payload.Role !== "Manager_All") {
     ss.getSheetByName("Account_Warehouse").appendRow([payload.Username_Email, payload.Warehouse]);
  }

  return createJsonResponse({status: 'success', message: 'Akun berhasil ditambahkan!'});
}

function createJsonResponse(responseObject) { 
    return ContentService.createTextOutput(JSON.stringify(responseObject)).setMimeType(ContentService.MimeType.JSON); 
}