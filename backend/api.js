// Ganti dengan Spreadsheet ID milikmu
const SPREADSHEET_ID = '11kKHKzOSc4IygRvkmiKrj76Yd4aoacCYRplIeQI4sgU';

// Fungsi utama untuk menerima request POST (Insert/Update Data)
function doPost(e) {
  try {
    let data = JSON.parse(e.postData.contents);
    let action = data.action;

    // Routing action
    if (action === "submit_visitor") {
      return handleVisitorSubmit(data.payload);
    }

    return createJsonResponse({ status: 'error', message: 'Action not found' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// Fungsi khusus untuk memasukkan data Visitor ke Spreadsheet
function handleVisitorSubmit(payload) {
  let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitor_Request");

  // Generate ID unik & Timestamp
  let timestamp = new Date();
  let requestId = "REQ-" + Utilities.formatDate(timestamp, "GMT+7", "yyyyMMddHHmmss");

  // Susunan array ini HARUS sama persis urutannya dengan kolom di Spreadsheet
  let rowData = [
    requestId,
    timestamp,
    payload.Name,
    payload.Email,
    payload.ID_Number,
    payload.Category,
    payload.Department,
    payload.Company,
    payload.Visit_Date,
    payload.Visit_Purpose,
    payload.Warehouse_Code,
    "Pending" // Status awal selalu Pending untuk di-approve Manager
  ];

  sheet.appendRow(rowData);

  return createJsonResponse({
    status: 'success',
    message: 'Visitor request submitted successfully',
    data: { request_id: requestId }
  });
}

// Helper untuk membalas request dengan format JSON
function createJsonResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}