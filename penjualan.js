
        const googleSheetUrl =
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVO_Ihk_q3bjL-Yn8e-VcYOk9EkfggR8u_s01HD5vcVNwfT8Jf0XyeUHcxEU51V1Fl1Tgs6VtIj3Xp/pub?gid=0&single=true&output=csv";

        let allSalesData = [];
        let headerRow = [];

        // VARIABEL STATE PAGINASI
        let currentPage = 1;
        let rowsPerPage = 10;
        let filteredDataGlobal = [];

        function formatRupiah(number) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(number);
        }

        function cleanCellValue(value) {
            return value ? value.trim().replace(/"/g, '') : '';
        }

        // FUNGSI UTILITY UNTUK MEMBUAT TOMBOL PAGINASI
        function createPageButton(text, pageNum, isDisabled, isActive) {
            const button = document.createElement('button');
            button.innerText = text;
            button.classList.add('page-button');
            if (isActive) {
                button.classList.add('active');
            }
            button.disabled = isDisabled;

            if (!isDisabled) {
                button.addEventListener('click', () => {
                    currentPage = pageNum;
                    renderTableWithPagination();
                });
            }
            return button;
        }

        async function fetchAllData() {
            document.getElementById("employee-data").innerHTML = '<p class="loading">Memuat data...</p>';
            document.getElementById('total-sales-display').innerText = "Memuat...";

            try {
                const response = await fetch(googleSheetUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const csvText = await response.text();

                // Menggunakan Regex untuk menangani kasus koma di dalam tanda kutip (lebih kuat)
                const rows = csvText.split('\n').map(row => {
                    // Split berdasarkan koma di luar tanda kutip
                    return row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [row];
                }).filter(row => row.join('').trim() !== "");

                if (rows.length < 2) {
                    document.getElementById("employee-data").innerHTML =
                        '<p class="error">Tidak ada data ditemukan selain header.</p>';
                    document.getElementById('total-sales-display').innerText = formatRupiah(0);
                    return;
                }

                headerRow = rows[0].map(h => cleanCellValue(h));
                allSalesData = rows.slice(1).map(row => row.map(cell => cleanCellValue(cell)));

                // MODIFIKASI BARU: Urutkan data berdasarkan kolom tanggal (indeks 0) dari yang terbaru (Descending)
                const dateIndex = 0;
                allSalesData.sort((a, b) => {
                    const dateA = new Date(a[dateIndex]);
                    const dateB = new Date(b[dateIndex]);
                    // b - a untuk Descending (Terbaru ke Terlama)
                    return dateB - dateA;
                });

                // SIMPAN SEMUA DATA YANG SUDAH DIAMBIL UNTUK FILTERING
                filteredDataGlobal = allSalesData;
                applyFilterAndRender();

            } catch (error) {
                console.error("Error fetching data:", error);
                document.getElementById("employee-data").innerHTML =
                    '<p class="error">Gagal memuat data. Periksa URL Google Sheet dan koneksi. Detail: ' + error.message + "</p>";
                document.getElementById('total-sales-display').innerText = "Gagal memuat";
            }
        }

        function applyFilterAndRender() {
            const startDateStr = document.getElementById('filter-start-date').value;
            const endDateStr = document.getElementById('filter-end-date').value;

            // RESET HALAMAN KE-1 SETIAP KALI FILTER BERUBAH
            currentPage = 1;

            let filteredData = allSalesData;

            // 1. Logika Pemfilteran Tanggal
            if (startDateStr || endDateStr) {
                const startDate = startDateStr ? new Date(startDateStr) : null;
                const endDate = endDateStr ? new Date(endDateStr) : null;

                filteredData = allSalesData.filter(row => {
                    const dateIndex = 0;
                    const rowDateStr = row[dateIndex];

                    if (!rowDateStr) return false;

                    const rowDate = new Date(rowDateStr.split(' ')[0]);

                    let isAfterStart = true;
                    if (startDate) {
                        isAfterStart = rowDate >= startDate;
                    }

                    let isBeforeEnd = true;
                    if (endDate) {
                        const adjustedEndDate = new Date(endDate);
                        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
                        isBeforeEnd = rowDate < adjustedEndDate;
                    }

                    return isAfterStart && isBeforeEnd;
                });
            }

            // SIMPAN DATA YANG SUDAH DIFILTER UNTUK DIGUNAKAN OLEH PAGINASI
            filteredDataGlobal = filteredData;
            renderTableWithPagination();
        }

        // FUNGSI UNTUK MERENDER TABEL DENGAN PAGINASI (DIMODIFIKASI)
        function renderTableWithPagination() {
            const dataToRender = filteredDataGlobal;
            let totalSales = 0;

            // Dapatkan Indeks Kolom yang Relevan
            const totalIndex = headerRow.findIndex(h => h.toLowerCase().includes('total'));
            const statusIndex = headerRow.findIndex(h => h.toLowerCase().includes('status'));

            const tableContainer = document.getElementById("employee-data");
            const totalSalesDisplay = document.getElementById('total-sales-display');
            const paginationControls = document.getElementById('pagination-controls');

            // 1. LOGIKA PAGINASI
            const rowsPerPageIndex = document.getElementById('rows-per-page-select').value;

            // Mengatur rowsPerPage. Jika '0' (Semua), tampilkan semua baris.
            rowsPerPage = parseInt(rowsPerPageIndex) || dataToRender.length;
            if (rowsPerPage === 0) rowsPerPage = dataToRender.length;

            const totalRows = dataToRender.length;
            const totalPages = rowsPerPage === dataToRender.length ? 1 : Math.ceil(totalRows / rowsPerPage);

            // Batasi currentPage agar tidak melebihi atau kurang dari batas
            if (currentPage > totalPages) {
                currentPage = totalPages > 0 ? totalPages : 1;
            }
            if (currentPage < 1) {
                currentPage = 1;
            }

            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = rowsPerPage === dataToRender.length ? totalRows : Math.min(startIndex + rowsPerPage, totalRows);
            const paginatedData = dataToRender.slice(startIndex, endIndex);

            // 2. PERHITUNGAN TOTAL PENJUALAN & MERENDER TABEL

            // Perhitungan total penjualan (menggunakan SEMUA data yang difilter)
            if (totalIndex !== -1) {
                dataToRender.forEach(row => {
                    const totalCell = row[totalIndex] || "0";
                    // Penanganan format Rupiah (misal: Rp100.000,00)
                    const numericTotalCell = totalCell.replace(/[^0-9,]/g, '').replace(/,/g, '.');
                    const totalValue = parseFloat(numericTotalCell) || 0;
                    totalSales += totalValue;
                });
            }

            let html = "<div class='table-responsive'>";
            html += "<table><thead><tr>";

            headerRow.forEach((header) => {
                html += `<th>${header}</th>`;
            });
            html += "</tr></thead><tbody>";

            // Merender baris yang dipaginasi
            if (paginatedData.length > 0) {
                paginatedData.forEach(row => {
                    html += "<tr>";
                    row.forEach((cell, index) => {
                        let cellContent = cell;
                        let cellClass = '';

                        // Cek apakah ini kolom status
                        if (index === statusIndex) {
                            const originalCell = cell;
                            const status = originalCell.toLowerCase().trim();
                            let statusClass = '';
                            let displayCell = originalCell;

                            if (status.includes('selesai')) {
                                statusClass = 'status-selesai';
                            } else if (status.includes('proses')) {
                                statusClass = 'status-proses';
                            } else if (status.includes('batal')) {
                                statusClass = 'status-batal';
                            }
                            // PERUBAHAN: Jika status kosong, TAMPILKAN KOSONG dan tidak ada kelas warna khusus.

                            // Bungkus konten sel dengan span agar dapat diberi gaya
                            cellContent = `<span class="status-cell ${statusClass}">${displayCell}</span>`;
                        }

                        html += `<td class="${cellClass}">${cellContent}</td>`;
                    });
                    html += "</tr>";
                });
            } else {
                html += '<tr><td colspan="' + headerRow.length + '"><p class="loading">Tidak ada data yang tersedia di halaman ini atau filter yang diterapkan.</p></td></tr>';
            }

            html += "</tbody></table>";
            html += "</div>";

            tableContainer.innerHTML = html;

            // Perbarui Total Penjualan
            if (totalIndex !== -1) {
                totalSalesDisplay.innerText = formatRupiah(totalSales);
            } else {
                totalSalesDisplay.innerText = "Kolom 'Total' Tidak Ditemukan";
            }

            // 3. MERENDER KONTROL PAGINASI
            paginationControls.innerHTML = '';

            if (totalPages > 1) {
                const prevButton = createPageButton('← Sebelumnya', currentPage - 1, currentPage === 1, false);
                paginationControls.appendChild(prevButton);

                // Logika tampilan tombol agar tidak terlalu banyak (menampilkan maks 5 tombol di sekitar halaman aktif)
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);

                if (currentPage <= 3) {
                    endPage = Math.min(totalPages, 5);
                } else if (currentPage > totalPages - 2) {
                    startPage = Math.max(1, totalPages - 4);
                }

                // Tombol '1' dan elipsis di awal
                if (startPage > 1) {
                    paginationControls.appendChild(createPageButton('1', 1, false, currentPage === 1));
                    if (startPage > 2) {
                        const dots = document.createElement('span');
                        dots.innerText = '...';
                        dots.style.padding = '8px 5px';
                        paginationControls.appendChild(dots);
                    }
                }

                // Tombol halaman di tengah
                for (let i = startPage; i <= endPage; i++) {
                    const button = createPageButton(i.toString(), i, false, currentPage === i);
                    paginationControls.appendChild(button);
                }

                // Elipsis dan tombol terakhir di akhir
                if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                        const dots = document.createElement('span');
                        dots.innerText = '...';
                        dots.style.padding = '8px 5px';
                        paginationControls.appendChild(dots);
                    }
                    paginationControls.appendChild(createPageButton(totalPages.toString(), totalPages, false, currentPage === totalPages));
                }

                const nextButton = createPageButton('Berikutnya →', currentPage + 1, currentPage === totalPages, false);
                paginationControls.appendChild(nextButton);
            }
        }


        // Event Listeners
        document.addEventListener('DOMContentLoaded', () => {
            fetchAllData();

            document.getElementById("btn-refresh").addEventListener("click", fetchAllData);

            document.getElementById('btn-apply-filter').addEventListener('click', applyFilterAndRender);

            document.getElementById('filter-start-date').addEventListener('change', applyFilterAndRender);
            document.getElementById('filter-end-date').addEventListener('change', applyFilterAndRender);

            // EVENT LISTENER UNTUK KONTROL JUMLAH BARIS
            document.getElementById('rows-per-page-select').addEventListener('change', applyFilterAndRender);
        });



    // FUNGSI BARU UNTUK MENGHAMBAT INSPECT ELEMENT
    document.addEventListener('contextmenu', function(e) {
        // Menonaktifkan klik kanan
        e.preventDefault();
    });

    document.onkeydown = function(e) {
        // Menonaktifkan F12 (Developer Tools)
        if (e.keyCode == 123) {
            return false;
        }
        // Menonaktifkan Ctrl+Shift+I (Developer Tools)
        if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
            return false;
        }
        // Menonaktifkan Ctrl+Shift+J (Console/Developer Tools)
        if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
            return false;
        }
        // Menonaktifkan Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
            return false;
        }
    }
    // AKHIR FUNGSI PENGHAMBATAN
    