import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", async () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    // Inicializar los iconos de Lucide
    lucide.createIcons();

    // Referencias a los elementos del DOM
    const searchInput = document.getElementById("search-inventario");
    const filterStock = document.getElementById("filter-stock");
    const btnExportar = document.getElementById("btn-exportar");
    const tbodyInventario = document.getElementById("table-body");

    // Formateador de Moneda Colombiana (COP)
    const formatMoney = (amount) => {
        return "$ " + Math.round(amount).toLocaleString('es-CO');
    };

    // --- FUNCIÓN PARA CARGAR LOS PRODUCTOS DESDE SUPABASE ---
    async function cargarInventario() {
        tbodyInventario.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem;">Cargando inventario real...</td></tr>';

        try {
            // Consultar todos los productos filtrando los activos si manejas esa bandera
            const { data: productos, error } = await supabaseClient
                .from('productos')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;

            tbodyInventario.innerHTML = ""; // Limpiar tabla

            if (productos.length === 0) {
                tbodyInventario.innerHTML = '<tr><td colspan="7" class="text-center">No hay productos registrados en la base de datos.</td></tr>';
                return;
            }

            // Renderizar dinámicamente cada fila
            productos.forEach(prod => {
                const stock = parseInt(prod.stock) || 0;
                const precioCompra = parseFloat(prod.precio_compra) || 0;
                const precioVenta = parseFloat(prod.precio_venta) || 0;
                const valorTotalCosto = stock * precioCompra;

                // Lógica de Alertas de Stock basadas en tus clases CSS
                let badgeText = "Normal";
                let badgeClass = "status-ok";

                if (stock === 0) {
                    badgeText = "Agotado";
                    badgeClass = "status-critical";
                } else if (stock < 10) {
                    badgeText = "Stock Bajo";
                    badgeClass = "status-low";
                }

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${prod.id}</td>
                    <td class="bold">${prod.nombre}</td>
                    <td>${formatMoney(precioCompra)}</td>
                    <td>${formatMoney(precioVenta)}</td>
                    <td>${stock}</td>
                    <td class="bold">${formatMoney(valorTotalCosto)}</td>
                    <td class="text-center">
                        <span class="alert-badge ${badgeClass}">${badgeText}</span>
                    </td>
                `;
                tbodyInventario.appendChild(tr);
            });

        } catch (error) {
            console.error("Error al obtener inventario:", error);
            tbodyInventario.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al conectar con la base de datos.</td></tr>';
        }
    }

    // --- FUNCIÓN UNIFICADA PARA FILTRAR EN TIEMPO REAL ---
    function filtrarTabla() {
        const textSearch = searchInput.value.toLowerCase();
        const stockCriteria = filterStock.value;
        const rows = tbodyInventario.querySelectorAll("tr");

        rows.forEach(row => {
            // Validar que la fila no sea un mensaje de "Cargando..." o error
            if (row.cells.length < 7) return;

            const productCode = row.cells[0].textContent.toLowerCase();
            const productName = row.cells[1].textContent.toLowerCase();
            const alertBadge = row.cells[6].querySelector(".alert-badge");

            // Evaluar filtro por Texto
            const matchText = productName.includes(textSearch) || productCode.includes(textSearch);

            // Evaluar filtro por Estado de Stock
            let matchStock = false;
            if (stockCriteria === "todos") {
                matchStock = true;
            } else if (stockCriteria === "bajo" && (alertBadge.classList.contains("status-low") || alertBadge.classList.contains("status-critical"))) {
                matchStock = true;
            } else if (stockCriteria === "ok" && alertBadge.classList.contains("status-ok")) {
                matchStock = true;
            }

            // Aplicar visibilidad final
            if (matchText && matchStock) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }

    // --- ESCUCHADORES DE FILTROS ---
    searchInput.addEventListener("input", filtrarTabla);
    filterStock.addEventListener("change", filtrarTabla);

    // --- EXPORTACIÓN DE REPORTE REAL A PDF (MÉTODO COMPACTO) ---
    btnExportar.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("Librería jsPDF no detectada. Por favor, añádela al HTML.");
            return;
        }

        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.text("MICROMERCADO LA 40 - REPORTE DE EXISTENCIAS", 14, 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Generado el: ${new Date().toLocaleString('es-CO')}`, 14, 22);

        const headers = [["Código", "Producto", "P. Compra", "P. Venta", "Stock", "Valor Total"]];
        const rows = [];

        tbodyInventario.querySelectorAll("tr").forEach(row => {
            if (row.style.display !== "none" && row.cells.length >= 6) {
                rows.push([
                    row.cells[0].textContent,
                    row.cells[1].textContent,
                    row.cells[2].textContent,
                    row.cells[3].textContent,
                    row.cells[4].textContent,
                    row.cells[5].textContent
                ]);
            }
        });

        doc.autoTable({
            startY: 28,
            head: headers,
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [67, 124, 67] }
        });

        doc.save(`Inventario_Actual_${new Date().toISOString().split('T')[0]}.pdf`);
    });

    // --- ACCIÓN DE CERRAR SESIÓN ---
    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            Swal.fire({
                title: '¿Estás seguro de que deseas cerrar sesión?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#437c43',
                cancelButtonColor: '#6d6d6dff',
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem("usuario");
                    window.location.href = "../../../index.html";
                }
            });    
        });
    }

    // Inicializar la carga al entrar a la vista
    cargarInventario();
});