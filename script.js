// ==================================================================
// == GANTI URL INI DENGAN URL WEB APP SCRIPT ANDA ==
// ==================================================================
const URL_SCRIPT =
  "https://script.google.com/macros/s/AKfycbzdGUvqYBnH5hNQ4rRb9LVe1SozdS1MDkymjvnSxYCROjv2wUaBEE28jHsW74uMKV0/exec";
// ==================================================================

// Menangkap elemen-elemen penting dari HTML
const form = document.getElementById("form-penjualan");
const jumlahInput = document.getElementById("jumlah");
const hargaInput = document.getElementById("harga");
const totalInput = document.getElementById("total");
const tombolKirim = document.getElementById("tombol-kirim");
const tombolTeks = document.querySelector(".tombol-teks");
const spinner = document.querySelector(".spinner");
const statusPesan = document.getElementById("status-pesan");

/**
 * Fungsi untuk memformat angka menjadi format mata uang Rupiah.
 * Contoh: 15000 menjadi "Rp 15.000"
 */
function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

/**
 * Fungsi untuk menghitung total harga (Jumlah x Harga)
 * dan menampilkannya di input 'total'.
 */
function hitungTotal() {
  // Mengambil nilai dari input, pastikan 0 jika kosong
  const jumlah = parseFloat(jumlahInput.value) || 0;
  const harga = parseFloat(hargaInput.value) || 0;

  // Menghitung total
  const total = jumlah * harga;

  // Menampilkan total yang sudah diformat
  totalInput.value = formatRupiah(total);
}

// Menambahkan 'event listener' ke input jumlah dan harga.
// 'hitungTotal' akan dijalankan setiap kali nilainya berubah.
jumlahInput.addEventListener("input", hitungTotal);
hargaInput.addEventListener("input", hitungTotal);

/**
 * Fungsi yang dijalankan saat formulir dikirim (submit).
 */
form.addEventListener("submit", function (e) {
  e.preventDefault(); // Mencegah halaman reload saat submit

  // Tampilkan loading dan nonaktifkan tombol
  tampilkanLoading(true);

  // Membuat objek data dari formulir
  const dataForm = new FormData(form);
  const data = {
    tanggal: dataForm.get("tanggal"),
    namaPemesan: dataForm.get("namaPemesan"),
    namaBarang: dataForm.get("namaBarang"),
    jumlah: dataForm.get("jumlah"),
    satuan: dataForm.get("satuan"),
    harga: dataForm.get("harga"),
    // Ambil total dari hasil kalkulasi, bukan dari input yang diformat
    total:
      (parseFloat(dataForm.get("jumlah")) || 0) *
      (parseFloat(dataForm.get("harga")) || 0),
  };

  // Mengirim data ke Google Apps Script menggunakan form submission tradisional
  // Ini adalah cara yang paling reliable untuk Google Apps Script tanpa masalah CORS
  const hiddenForm = document.createElement("form");
  hiddenForm.method = "POST";
  hiddenForm.action = URL_SCRIPT;
  hiddenForm.target = "hidden_iframe";
  hiddenForm.style.display = "none";

  // Tambahkan semua field ke form
  Object.keys(data).forEach((key) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = data[key];
    hiddenForm.appendChild(input);
  });

  // Buat atau gunakan iframe tersembunyi untuk submit form
  let iframe = document.getElementById("hidden_iframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "hidden_iframe";
    iframe.name = "hidden_iframe";
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  let submitCompleted = false;

  // Handler untuk mengetahui kapan form selesai submit
  const handleSubmitComplete = () => {
    if (submitCompleted) return;
    submitCompleted = true;

    tampilkanLoading(false);
    tampilkanStatus("Data berhasil terkirim!", "sukses");
    form.reset();
    totalInput.value = "Rp 0";
    
    // Hapus form setelah submit
    if (hiddenForm.parentNode) {
      document.body.removeChild(hiddenForm);
    }
  };

  // Tambahkan event listener untuk iframe load (untuk mengetahui kapan submit selesai)
  iframe.onload = () => {
    setTimeout(handleSubmitComplete, 500);
  };

  // Tambahkan form ke body dan submit
  document.body.appendChild(hiddenForm);
  hiddenForm.submit();

  // Fallback: jika iframe onload tidak trigger, gunakan timeout
  setTimeout(handleSubmitComplete, 2000);
});

/**
 * Fungsi untuk menampilkan/menyembunyikan status loading pada tombol.
 */
function tampilkanLoading(isLoading) {
  tombolKirim.disabled = isLoading;
  if (isLoading) {
    tombolTeks.style.display = "none";
    spinner.style.display = "inline-block";
  } else {
    tombolTeks.style.display = "inline-block";
    spinner.style.display = "none";
  }
}

/**
 * Fungsi untuk menampilkan pesan status (sukses atau gagal).
 */
function tampilkanStatus(pesan, tipe) {
  statusPesan.textContent = pesan;
  statusPesan.className = tipe; // 'sukses' atau 'gagal'

  // Hapus pesan setelah 5 detik
  setTimeout(() => {
    statusPesan.textContent = "";
    statusPesan.className = "";
  }, 5000);
}

// Menetapkan tanggal hari ini sebagai default
document.getElementById("tanggal").valueAsDate = new Date();
