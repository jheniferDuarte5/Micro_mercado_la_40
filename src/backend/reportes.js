import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", async () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    // Inicializar los iconos de Lucide
    lucide.createIcons();

    // Referencias al DOM
    const kpiVentas = document.getElementById("kpi-ventas");
    const kpiInversion = document.getElementById("kpi-inversion");
    const kpiCriticos = document.getElementById("kpi-criticos");
    const inputFechaInicio = document.getElementById("fecha-inicio");
    const inputFechaFin = document.getElementById("fecha-fin");
    const btnGenerar = document.getElementById("btn-generar");
    const btnExportarPdf = document.getElementById("btn-exportar-pdf");
    const tbodyRanking = document.getElementById("report-table-body");

    // Inicializar fechas al mes actual
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Formatear a YYYY-MM-DD
    inputFechaInicio.value = firstDay.toISOString().split('T')[0];
    inputFechaFin.value = today.toISOString().split('T')[0];

    // Función para formatear moneda
    const formatMoney = (amount) => {
        return "$ " + Math.round(amount).toLocaleString('es-CO');
    };

    // Función principal de carga y cálculo de reportes
    async function cargarReportes() {
        const fechaInicio = inputFechaInicio.value;
        const fechaFin = inputFechaFin.value;

        if (!fechaInicio || !fechaFin) {
            Swal.fire('Atención', 'Selecciona un rango de fechas válido', 'warning');
            return;
        }

        // --- 1. Cargar Productos (Para métricas de stock y nombres del ranking) ---
        const { data: productos, error: errProd } = await supabaseClient
            .from('productos')
            .select('*');
        
        if (errProd) {
            console.error("Error al cargar productos", errProd);
            return;
        }

        let inversionTotal = 0;
        let criticosCount = 0;
        const productosMap = {};

        productos.forEach(p => {
            // Guardamos en un diccionario/mapa para un acceso rápido luego
            productosMap[p.id] = p; 
            
            // Calcular inversión y críticos solo de productos activos (o todos si prefieres)
            if (p.estado !== false) {
                const stock = parseInt(p.stock) || 0;
                const costo = parseFloat(p.precio_compra) || 0;
                
                inversionTotal += (stock * costo);
                
                // Umbral de críticos
                if (stock < 10) {
                    criticosCount++;
                }
            }
        });

        kpiInversion.textContent = formatMoney(inversionTotal);
        kpiCriticos.textContent = criticosCount;

        // --- 2. Cargar Total Ventas (Cabecera) ---
        const { data: salidasCabecera, error: errCabecera } = await supabaseClient
            .from('salidas_cabecera')
            .select('id, total, motivo')
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin);

        let totalVentasRango = 0;
        const cabecerasVentaIds = [];

        if (!errCabecera && salidasCabecera) {
            salidasCabecera.forEach(salida => {
                // Solo sumamos e incluimos en el ranking si el motivo es Venta
                const motivo = salida.motivo ? salida.motivo.toLowerCase() : 'venta';
                if (motivo === 'venta') {
                    totalVentasRango += parseFloat(salida.total || 0);
                    cabecerasVentaIds.push(salida.id);
                }
            });
        }
        kpiVentas.textContent = formatMoney(totalVentasRango);

        // --- 3. Cargar Detalles y Generar Ranking ---
        tbodyRanking.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem;">Calculando estadísticas...</td></tr>';
        
        if (cabecerasVentaIds.length > 0) {
            // Traemos todos los detalles que pertenezcan a las ventas del rango
            const { data: detalles, error: errDetalles } = await supabaseClient
                .from('salidas_detalle')
                .select('producto_id, cantidad, precio_venta')
                .in('salida_id', cabecerasVentaIds);

            if (!errDetalles && detalles) {
                // Algoritmo de agrupación
                const ventasPorProducto = {};
                
                detalles.forEach(det => {
                    const pid = det.producto_id;
                    const qty = parseInt(det.cantidad) || 0;
                    const precio = parseFloat(det.precio_venta) || 0;

                    if (!ventasPorProducto[pid]) {
                        ventasPorProducto[pid] = { cantidad: 0, recaudado: 0 };
                    }
                    
                    ventasPorProducto[pid].cantidad += qty;
                    ventasPorProducto[pid].recaudado += (qty * precio);
                });

                // Convertir mapa a Array y anexar la información del producto
                const ranking = Object.keys(ventasPorProducto).map(pid => {
                    const prodInfo = productosMap[pid] || { nombre: 'Producto no encontrado', categoria: 'N/A' };
                    return {
                        id: pid,
                        nombre: prodInfo.nombre,
                        categoria: prodInfo.categoria,
                        cantidad: ventasPorProducto[pid].cantidad,
                        recaudado: ventasPorProducto[pid].recaudado
                    };
                });

                // Ordenar de mayor a menor según unidades vendidas
                ranking.sort((a, b) => b.cantidad - a.cantidad);

                // Renderizar tabla (Solo los mejores 10)
                tbodyRanking.innerHTML = '';
                const topRanking = ranking.slice(0, 10);
                
                if (topRanking.length === 0) {
                    tbodyRanking.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem;">No hay detalles de venta en este rango.</td></tr>';
                } else {
                    topRanking.forEach((item, index) => {
                        // Estilos dinámicos para los primeros 3 puestos
                        let rankClass = "bold text-muted";
                        if (index === 0) rankClass = "bold text-green";
                        else if (index === 1) rankClass = "bold text-green";
                        else if (index === 2) rankClass = "bold text-green";

                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td class="${rankClass}">#${index + 1}</td>
                            <td>${item.id}</td>
                            <td class="bold">${item.nombre}</td>
                            <td>${item.categoria}</td>
                            <td class="text-center bold">${item.cantidad}</td>
                            <td class="bold">${formatMoney(item.recaudado)}</td>
                        `;
                        tbodyRanking.appendChild(tr);
                    });
                }
            } else {
                tbodyRanking.innerHTML = '<tr><td colspan="6" class="text-center text-danger" style="padding: 2rem;">Error al calcular el ranking.</td></tr>';
            }
        } else {
            // No hubo salidas_cabecera de tipo 'venta'
            tbodyRanking.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">No hay ventas registradas en las fechas seleccionadas.</td></tr>';
        }
    }

    // Inicializar reporte al cargar la página
    cargarReportes();

    // Actualizar reporte al dar clic en el botón
    btnGenerar.addEventListener("click", cargarReportes);

    // --- MÉTODO PARA GENERAR Y EXPORTAR EL PDF ---
    if (btnExportarPdf) {
        btnExportarPdf.addEventListener("click", () => {
            // 1. Validar que la tabla tenga datos cargados
            const filas = tbodyRanking.querySelectorAll("tr");
            if (filas.length === 0 || filas[0].textContent.includes("No hay") || filas[0].textContent.includes("Calculando")) {
                Swal.fire('Atención', 'No hay datos en el reporte para exportar', 'warning');
                return;
            }

            // Mostrar mensaje de carga corto
            Swal.fire({
                title: 'Generando PDF',
                text: 'Por favor espera un momento...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

                // 2. Configuración de Paleta de Colores (Estilo Ejecutivo / Verde Esmeralda)
                const PRIMARY_COLOR = [67, 124, 67]; // El #437c43 de tus botones
                const SECONDARY_COLOR = [109, 109, 109];
                const TEXT_COLOR = [40, 40, 40];

                // 3. Encabezado del Reporte
                doc.setFillColor(...PRIMARY_COLOR);
                doc.rect(0, 0, 210, 35, 'F'); // Franja superior

                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text("REPORTE EJECUTIVO DE INVENTARIO", 15, 22);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, 15, 30);

                // 4. Bloque Informativo de Filtros
                doc.setTextColor(...TEXT_COLOR);
                doc.setFont("helvetica", "bold");
                doc.text("Período Evaluado:", 15, 48);
                doc.setFont("helvetica", "normal");
                doc.text(`Desde: ${inputFechaInicio.value}   Hasta: ${inputFechaFin.value}`, 50, 48);

                // Línea divisoria
                doc.setDrawColor(220, 220, 220);
                doc.line(15, 53, 195, 53);

                // 5. Renderizar los KPIs en Formato de Cuadrícula Visual
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(...SECONDARY_COLOR);
                
                doc.text("TOTAL VENTAS", 15, 63);
                doc.text("INVERSIÓN TOTAL", 85, 63);
                doc.text("PRODUCTOS CRÍTICOS", 155, 63);

                doc.setFontSize(16);
                doc.setTextColor(...PRIMARY_COLOR);
                doc.text(kpiVentas.textContent, 15, 71);
                doc.text(kpiInversion.textContent, 85, 71);
                
                // Si hay críticos, los pintamos en rojo de advertencia
                if (parseInt(kpiCriticos.textContent) > 0) {
                    doc.setTextColor(180, 40, 40); 
                }
                doc.text(kpiCriticos.textContent, 155, 71);

                // Línea divisoria inferior de KPIs
                doc.setDrawColor(220, 220, 220);
                doc.line(15, 78, 195, 78);

                // 6. Título de la sección de la Tabla
                doc.setTextColor(...PRIMARY_COLOR);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("Top 10 Productos Más Vendidos", 15, 88);

                // 7. Extraer y mapear los datos estructurados desde el DOM de la Tabla
                const tableHeaders = [["Puesto", "Código / ID", "Descripción del Producto", "Categoría", "Cant. Vendida", "Recaudado"]];
                const tableRows = [];

                filas.forEach(row => {
                    const cels = row.querySelectorAll("td");
                    if(cels.length >= 6) {
                        tableRows.push([
                            cels[0].textContent,
                            cels[1].textContent,
                            cels[2].textContent,
                            cels[3].textContent,
                            cels[4].textContent,
                            cels[5].textContent
                        ]);
                    }
                });

                // 8. Dibujar la Tabla usando jsPDF-AutoTable
                doc.autoTable({
                    startY: 93,
                    head: tableHeaders,
                    body: tableRows,
                    theme: 'striped',
                    headStyles: {
                        fillColor: PRIMARY_COLOR,
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'left'
                    },
                    columnStyles: {
                        0: { cellWidth: 18 },  // Puesto
                        1: { cellWidth: 32 },  // ID
                        3: { cellWidth: 30 },  // Categoría
                        4: { halign: 'center', cellWidth: 25 }, // Cantidad
                        5: { halign: 'left', cellWidth: 30 }   // Recaudado
                    },
                    styles: {
                        font: "helvetica",
                        fontSize: 9,
                        cellPadding: 3
                    },
                    alternateRowStyles: {
                        fillColor: [245, 249, 245] // Sutil fondo verde/grisáceo alternado
                    },
                    margin: { left: 15, right: 15 }
                });

                // 9. Pie de página numérico (Control de páginas dinámico)
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
                    doc.text("Reporte generado de forma automatizada por el Sistema de Inventario.", 15, 285);
                }

                // Cerrar Swal de carga y descargar archivo
                Swal.close();
                doc.save(`Reporte_Ventas_${inputFechaInicio.value}_al_${inputFechaFin.value}.pdf`);

            } catch (pdfError) {
                console.error("Error detallado al construir PDF:", pdfError);
                Swal.fire('Error', 'No se pudo estructurar el documento PDF: ' + pdfError.message, 'error');
            }
        });
    }

    // Acción del botón Cerrar Sesión
    const logoutBtn = document.querySelector(".logout-btn");
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
                // Borrar sesión de localStorage si es necesario
                localStorage.removeItem("usuario");
                window.location.href = "../../../index.html";
            }
        });    
    });
});