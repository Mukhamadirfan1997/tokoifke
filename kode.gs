// Ganti dengan nama sheet (tab) Anda di spreadsheet
const NAMA_SHEET = "Penjualan"; 

// FUNGSI INI WAJIB ADA UNTUK CORS (Preflight Request)
function doOptions(e) {
  var output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Set semua header CORS yang diperlukan
  output.setHeader("Access-Control-Allow-Origin", "*");
  output.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  output.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  output.setHeader("Access-Control-Max-Age", "3600");
  
  return output;
}

// Fungsi untuk membaca data dari spreadsheet
function doGet(e) {
  try {
    var action = e.parameter.action || "";
    
    // Jika action adalah "read", baca data dari spreadsheet
    if (action === "read") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(NAMA_SHEET);
      
      // Cek messageId untuk postMessage
      var messageId = e.parameter.messageId;
      
      // Pastikan sheet ada
      if (!sheet) {
        var errorData = { 
          "status": "gagal", 
          "message": "Sheet '" + NAMA_SHEET + "' tidak ditemukan" 
        };
        if (messageId) {
          errorData.messageId = messageId;
          var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body>";
          html += "<script>";
          html += "function sendData() {";
          html += "  try {";
          html += "    var data = " + JSON.stringify(errorData) + ";";
          html += "    if (window.parent && window.parent !== window) {";
          html += "      window.parent.postMessage(data, '*');";
          html += "    }";
          html += "  } catch(e) { console.error('Error sending postMessage:', e); }";
          html += "}";
          html += "if (document.readyState === 'loading') {";
          html += "  document.addEventListener('DOMContentLoaded', sendData);";
          html += "} else {";
          html += "  sendData();";
          html += "}";
          html += "setTimeout(sendData, 500);";
          html += "</script>";
          html += "</body></html>";
          return HtmlService.createHtmlOutput(html)
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        }
        return ContentService
          .createTextOutput(JSON.stringify(errorData))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeader("Access-Control-Allow-Origin", "*");
      }
      
      // Ambil semua data dari sheet (skip baris header jika ada)
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      
      // Jika tidak ada data atau hanya header
      if (values.length <= 1) {
        var emptyData = { 
          "status": "sukses", 
          "data": [],
          "message": "Tidak ada data" 
        };
        if (messageId) {
          emptyData.messageId = messageId;
          var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body>";
          html += "<script>";
          html += "function sendData() {";
          html += "  try {";
          html += "    var data = " + JSON.stringify(emptyData) + ";";
          html += "    if (window.parent && window.parent !== window) {";
          html += "      window.parent.postMessage(data, '*');";
          html += "    }";
          html += "  } catch(e) { console.error('Error sending postMessage:', e); }";
          html += "}";
          html += "if (document.readyState === 'loading') {";
          html += "  document.addEventListener('DOMContentLoaded', sendData);";
          html += "} else {";
          html += "  sendData();";
          html += "}";
          html += "setTimeout(sendData, 500);";
          html += "</script>";
          html += "</body></html>";
          return HtmlService.createHtmlOutput(html)
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        }
        return ContentService
          .createTextOutput(JSON.stringify(emptyData))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeader("Access-Control-Allow-Origin", "*");
      }
      
      // Skip baris pertama jika itu header (asumsikan baris pertama adalah header)
      // Atau ambil semua data jika tidak ada header yang jelas
      var data = [];
      var startRow = 0;
      
      // Cek apakah baris pertama adalah header (berisi teks seperti "Tanggal", "Nama", dll)
      var firstRow = values[0];
      var isHeader = false;
      if (firstRow && firstRow.length > 0) {
        var firstCell = firstRow[0].toString().toLowerCase();
        if (firstCell.includes("tanggal") || firstCell.includes("no") || firstCell === "") {
          isHeader = true;
          startRow = 1;
        }
      }
      
      // Ambil data mulai dari baris kedua (atau pertama jika tidak ada header)
      for (var i = startRow; i < values.length; i++) {
        var row = values[i];
        // Hanya ambil baris yang tidak kosong
        if (row && row.length > 0 && row[0] !== "") {
          data.push(row);
        }
      }
      
      // Siapkan response data
      var responseData = {
        "status": "sukses", 
        "data": data,
        "message": "Data berhasil diambil"
      };
      
      // Return sebagai HTML dengan script tag untuk postMessage
      if (messageId) {
        // Tambahkan messageId ke response data
        responseData.messageId = messageId;
        // Return sebagai HTML yang berisi script untuk mengirim postMessage ke parent window
        var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body>";
        html += "<script>";
        html += "function sendData() {";
        html += "  try {";
        html += "    var data = " + JSON.stringify(responseData) + ";";
        html += "    console.log('[IFRAME] Sending postMessage with data:', data);";
        html += "    if (window.parent && window.parent !== window) {";
        html += "      window.parent.postMessage(data, '*');";
        html += "      console.log('[IFRAME] postMessage sent successfully');";
        html += "    } else {";
        html += "      console.error('[IFRAME] window.parent is not available');";
        html += "    }";
        html += "  } catch(e) {";
        html += "    console.error('[IFRAME] Error sending postMessage:', e);";
        html += "  }";
        html += "}";
        html += "// Jalankan saat DOM ready";
        html += "if (document.readyState === 'loading') {";
        html += "  document.addEventListener('DOMContentLoaded', sendData);";
        html += "} else {";
        html += "  sendData();";
        html += "}";
        html += "// Retry setelah 500ms jika belum berhasil";
        html += "setTimeout(sendData, 500);";
        html += "</script>";
        html += "</body></html>";
        return HtmlService.createHtmlOutput(html)
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      } else {
        // Return sebagai JSON biasa
        return ContentService
          .createTextOutput(JSON.stringify(responseData))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeader("Access-Control-Allow-Origin", "*");
      }
    }
    
    // Default response
    var defaultError = { 
      "status": "gagal", 
      "message": "Action tidak valid. Gunakan ?action=read" 
    };
    var messageId = e.parameter.messageId;
    if (messageId) {
      defaultError.messageId = messageId;
      var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body>";
      html += "<script>";
      html += "function sendData() {";
      html += "  try {";
      html += "    var data = " + JSON.stringify(defaultError) + ";";
      html += "    if (window.parent && window.parent !== window) {";
      html += "      window.parent.postMessage(data, '*');";
      html += "    }";
      html += "  } catch(e) { console.error('Error sending postMessage:', e); }";
      html += "}";
      html += "if (document.readyState === 'loading') {";
      html += "  document.addEventListener('DOMContentLoaded', sendData);";
      html += "} else {";
      html += "  sendData();";
      html += "}";
      html += "setTimeout(sendData, 500);";
      html += "</script>";
      html += "</body></html>";
      return HtmlService.createHtmlOutput(html)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    return ContentService
      .createTextOutput(JSON.stringify(defaultError))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
      
  } catch (error) {
    Logger.log("Error doGet: " + error.toString());
    var errorData = { 
      "status": "gagal", 
      "message": error.toString() 
    };
    var messageId = e ? e.parameter.messageId : null;
    if (messageId) {
      errorData.messageId = messageId;
      var html = "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body>";
      html += "<script>";
      html += "function sendData() {";
      html += "  try {";
      html += "    var data = " + JSON.stringify(errorData) + ";";
      html += "    if (window.parent && window.parent !== window) {";
      html += "      window.parent.postMessage(data, '*');";
      html += "    }";
      html += "  } catch(e) { console.error('Error sending postMessage:', e); }";
      html += "}";
      html += "if (document.readyState === 'loading') {";
      html += "  document.addEventListener('DOMContentLoaded', sendData);";
      html += "} else {";
      html += "  sendData();";
      html += "}";
      html += "setTimeout(sendData, 500);";
      html += "</script>";
      html += "</body></html>";
      return HtmlService.createHtmlOutput(html)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    return ContentService
      .createTextOutput(JSON.stringify(errorData))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

function doPost(e) {
  try {
    var data = {};
    
    // Prioritaskan membaca dari parameter (untuk URL-encoded form data)
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    } 
    // Jika tidak ada di parameter, coba baca dari postData
    else if (e.postData && e.postData.contents) {
      var contentType = e.postData.type || "";
      
      // Jika content-type adalah multipart/form-data (dari FormData)
      if (contentType.indexOf("multipart/form-data") !== -1) {
        // Google Apps Script otomatis parse multipart/form-data ke e.parameter
        // Tapi jika tidak ada, coba parse manual
        if (!e.parameter || Object.keys(e.parameter).length === 0) {
          // Parse multipart data manual (kompleks, jadi lebih baik gunakan e.parameter)
          // Tapi untuk sekarang, coba baca dari e.parameter dulu
          data = e.parameter || {};
        } else {
          data = e.parameter;
        }
      }
      // Jika content-type adalah application/x-www-form-urlencoded
      else if (contentType.indexOf("application/x-www-form-urlencoded") !== -1) {
        // Parse URL-encoded data
        var params = e.postData.contents.split("&");
        for (var i = 0; i < params.length; i++) {
          var pair = params[i].split("=");
          if (pair.length === 2) {
            data[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1].replace(/\+/g, " "));
          }
        }
      } 
      // Jika content-type adalah application/json
      else if (contentType.indexOf("application/json") !== -1) {
        try {
          data = JSON.parse(e.postData.contents);
        } catch (jsonError) {
          throw new Error("Error parsing JSON: " + jsonError.message);
        }
      }
      // Jika tidak ada content-type yang jelas atau content-type kosong
      else {
        // Coba baca dari e.parameter dulu (untuk multipart/form-data)
        if (e.parameter && Object.keys(e.parameter).length > 0) {
          data = e.parameter;
        }
        // Jika tidak ada, coba parse sebagai URL-encoded
        else if (e.postData.contents.indexOf("=") !== -1) {
          try {
            var params = e.postData.contents.split("&");
            for (var i = 0; i < params.length; i++) {
              var pair = params[i].split("=");
              if (pair.length === 2) {
                data[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1].replace(/\+/g, " "));
              }
            }
          } catch (e) {
            // Jika gagal, coba sebagai JSON
            try {
              data = JSON.parse(e.postData.contents);
            } catch (jsonError) {
              throw new Error("Tidak bisa membaca data. Content-Type: " + contentType + ", Contents: " + e.postData.contents.substring(0, 100));
            }
          }
        }
        // Jika masih tidak berhasil, coba sebagai JSON
        else {
          try {
            data = JSON.parse(e.postData.contents);
          } catch (jsonError) {
            throw new Error("Tidak bisa membaca data. Content-Type: " + contentType);
          }
        }
      }
    }
    
    // Validasi data minimal
    if (!data.tanggal && !data.namaPemesan && !data.namaBarang) {
      throw new Error("Data tidak ditemukan dalam request");
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(NAMA_SHEET);
    
    // Pastikan sheet ada
    if (!sheet) {
      throw new Error("Sheet '" + NAMA_SHEET + "' tidak ditemukan");
    }

    sheet.appendRow([
      data.tanggal || "",
      data.namaPemesan || "",
      data.namaBarang || "",
      data.jumlah || "",
      data.satuan || "",
      data.harga || "",
      data.total || ""
    ]);

    // WAJIB: Gunakan setHeader (singular)
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "sukses", "message": "Data berhasil disimpan" }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*"); 

  } catch (error) {
    // Log error untuk debugging
    Logger.log("Error: " + error.toString());
    Logger.log("e.parameter: " + JSON.stringify(e.parameter));
    Logger.log("e.postData: " + JSON.stringify(e.postData));
    
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "gagal", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*"); 
  }
}