// ==================================================================
// == GANTI URL INI DENGAN URL WEB APP SCRIPT ANDA ==
// ==================================================================
const URL_SCRIPT =
  "https://script.google.com/macros/s/AKfycbzdGUvqYBnH5hNQ4rRb9LVe1SozdS1MDkymjvnSxYCROjv2wUaBEE28jHsW74uMKV0/exec";
// ==================================================================

// Elemen DOM
const loadingContainer = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const dataContainer = document.getElementById("data-container");
const tableBody = document.getElementById("table-body");
const totalTransaksiEl = document.getElementById("total-transaksi");
const summaryTotalEl = document.getElementById("summary-total");
const summaryTotalHargaEl = document.getElementById("summary-total-harga");
const btnRefresh = document.getElementById("btn-refresh");

/**
 * Fungsi untuk memformat angka menjadi format mata uang Rupiah.
 */
function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

/**
 * Fungsi untuk memformat tanggal dari format database ke format Indonesia
 */
function formatTanggal(tanggal) {
  if (!tanggal) return "-";
  try {
    const date = new Date(tanggal);
    if (isNaN(date.getTime())) {
      return tanggal; // Jika tidak valid, kembalikan asli
    }
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    return tanggal;
  }
}

/**
 * Fungsi untuk mengambil data dari Google Apps Script menggunakan iframe dan postMessage
 * Ini menghindari masalah CORS dan CORB dengan Google Apps Script
 */
function ambilData() {
  // Tampilkan loading
  loadingContainer.style.display = "block";
  errorMessage.style.display = "none";
  dataContainer.style.display = "none";

  // Buat unique message ID
  const messageId = "dataMessage_" + Date.now();
  let messageHandler = null;
  let timeoutId = null;

  // Handler untuk menerima pesan dari iframe
  messageHandler = function(event) {
    // Log semua pesan untuk debugging
    console.log("[PARENT] Message received from:", event.origin, "Data:", event.data);
    console.log("[PARENT] Expected messageId:", messageId);
    
    // Hanya terima pesan dengan messageId yang sesuai
    if (!event.data || typeof event.data !== "object") {
      console.log("[PARENT] Message ignored - not an object or null");
      return;
    }
    
    if (event.data.messageId !== messageId) {
      console.log("[PARENT] Message ignored - wrong messageId. Got:", event.data.messageId, "Expected:", messageId);
      return;
    }
    
    console.log("[PARENT] Message accepted! Processing...");

    // Cleanup
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    window.removeEventListener("message", messageHandler);
    const iframe = document.getElementById("data-iframe");
    if (iframe && iframe.parentNode) {
      document.body.removeChild(iframe);
    }

    try {
      const result = event.data;
      console.log("Processing result:", result);
      if (result.status === "sukses" && result.data) {
        tampilkanData(result.data);
      } else {
        throw new Error(result.message || "Data tidak ditemukan");
      }
    } catch (e) {
      console.error("Error processing data:", e);
      tampilkanError("Gagal memuat data: " + e.message);
    }
  };

  // Daftarkan event listener untuk postMessage
  window.addEventListener("message", messageHandler);

  // Buat URL dengan parameter action=read dan messageId
  const url = URL_SCRIPT + "?action=read&messageId=" + messageId;

  // Buat iframe untuk load halaman
  const iframe = document.createElement("iframe");
  iframe.id = "data-iframe";
  iframe.style.display = "none";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.src = url;
  
  console.log("Loading iframe with URL:", url);
  
  iframe.onload = function() {
    console.log("[PARENT] Iframe loaded successfully");
    // Coba akses iframe content untuk debugging (mungkin tidak bisa karena cross-origin)
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      console.log("[PARENT] Iframe document accessible:", !!iframeDoc);
    } catch(e) {
      console.log("[PARENT] Cannot access iframe content (cross-origin, this is normal):", e.message);
    }
  };
  
  iframe.onerror = function() {
    console.error("Iframe load error");
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    window.removeEventListener("message", messageHandler);
    const iframe = document.getElementById("data-iframe");
    if (iframe && iframe.parentNode) {
      document.body.removeChild(iframe);
    }
    tampilkanError("Gagal memuat data. Pastikan URL Script sudah benar dan Web App sudah di-deploy.");
  };
  
  document.body.appendChild(iframe);
  
  // Timeout fallback jika iframe tidak merespon
  timeoutId = setTimeout(function() {
    console.warn("Timeout waiting for postMessage");
    if (window.messageHandler) {
      window.removeEventListener("message", messageHandler);
    }
    const iframe = document.getElementById("data-iframe");
    if (iframe && iframe.parentNode) {
      document.body.removeChild(iframe);
    }
    tampilkanError("Timeout: Gagal memuat data. Pastikan Google Apps Script sudah di-deploy dan coba refresh halaman.");
  }, 15000);
}

/**
 * Fungsi untuk menampilkan data di tabel
 */
function tampilkanData(data) {
  // Sembunyikan loading
  loadingContainer.style.display = "none";

  if (!data || data.length === 0) {
    tampilkanError("Tidak ada data penjualan yang ditemukan.");
    return;
  }

  // Kosongkan tabel
  tableBody.innerHTML = "";

  let totalHarga = 0;

  // Tambahkan setiap baris data
  data.forEach((row, index) => {
    const tr = document.createElement("tr");

    // Parse data dari array
    const tanggal = row[0] || "";
    const namaPemesan = row[1] || "";
    const namaBarang = row[2] || "";
    const jumlah = row[3] || "0";
    const satuan = row[4] || "";
    const harga = row[5] || "0";
    const total = row[6] || "0";

    // Hitung total harga
    const totalNum = parseFloat(total) || 0;
    totalHarga += totalNum;

    // Buat baris tabel
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatTanggal(tanggal)}</td>
      <td>${namaPemesan}</td>
      <td>${namaBarang}</td>
      <td>${jumlah}</td>
      <td>${satuan}</td>
      <td>${formatRupiah(parseFloat(harga) || 0)}</td>
      <td><strong>${formatRupiah(totalNum)}</strong></td>
    `;

    tableBody.appendChild(tr);
  });

  // Update summary
  totalTransaksiEl.textContent = data.length;
  summaryTotalEl.textContent = data.length;
  summaryTotalHargaEl.textContent = formatRupiah(totalHarga);

  // Tampilkan container data
  dataContainer.style.display = "block";
}

/**
 * Fungsi untuk menampilkan error
 */
function tampilkanError(message) {
  console.error("Error message:", message);
  loadingContainer.style.display = "none";
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  dataContainer.style.display = "none";
}

// Event listener untuk tombol refresh
btnRefresh.addEventListener("click", ambilData);

// Ambil data saat halaman dimuat
document.addEventListener("DOMContentLoaded", ambilData);

