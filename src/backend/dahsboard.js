import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", async () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    const elWelcome = document.getElementById('welcome-nombre');
    if (elWelcome) elWelcome.textContent = '¡Bienvenido, ' + nombre + '!';

    // Inicializa los iconos de Lucide
    lucide.createIcons();

    // Redirecciones dinámicas para "Ver todos"
    const viewAllLinks = document.querySelectorAll(".view-all");
    viewAllLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            // Redireccionar automáticamente a la sección lógica
            window.location.href = "reportes.html";
        });
    });

    // Acción del botón Cerrar Sesión
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

    // ==========================================
    // CÓDIGO DINÁMICO DE DATOS - SUPABASE
    // ==========================================

    async function inicializarDashboard() {
        try {
            // Obtener el inicio y fin del día de hoy en formato ISO string
            const hoyInicio = new Date();
            hoyInicio.setHours(0,0,0,0);
            const hoyFin = new Date();
            hoyFin.setHours(23,59,59,999);

            // --- 1. CARGAR PRODUCTOS (Total e Inventario Bajo) ---
            const { data: productos, error: errProd } = await supabaseClient
                .from('productos')
                .select('id, nombre, stock');

            if (errProd) throw errProd;

            const totalProductos = productos.length;
            const productosBajos = productos.filter(p => (parseInt(p.stock) || 0) < 10);
            
            // Renderizar KPIs de productos
            document.getElementById("kpi-total-productos").textContent = totalProductos;
            document.getElementById("kpi-productos-bajos").textContent = productosBajos.length;

            // Renderizar Tabla de Stock Bajo (Top 5 con menor stock)
            const tbodyBajos = document.getElementById("tbody-stock-bajo");
            tbodyBajos.innerHTML = "";
            
            // Ordenar de menor a mayor stock
            const topBajos = [...productosBajos].sort((a,b) => a.stock - b.stock).slice(0, 5);
            
            if (topBajos.length === 0) {
                tbodyBajos.innerHTML = `<tr><td colspan="2" class="text-center text-muted">Todo el stock está al día 👍</td></tr>`;
            } else {
                topBajos.forEach(p => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${p.nombre}</td>
                        <td class="text-right bold text-danger">${p.stock}</td>
                    `;
                    tbodyBajos.appendChild(tr);
                });
            }

            // --- 2. ENTRADAS DE HOY ---
            const { data: entradas, error: errEntradas } = await supabaseClient
                .from('entradas_cabecera')
                .select('id')
                .gte('fecha', hoyInicio.toISOString())
                .lte('fecha', hoyFin.toISOString());

            if (!errEntradas && entradas) {
                document.getElementById("kpi-entradas-hoy").textContent = entradas.length;
            }

            // --- 3. SALIDAS DE HOY Y PRODUCTOS MÁS VENDIDOS ---
            const { data: salidas, error: errSalidas } = await supabaseClient
                .from('salidas_cabecera')
                .select('id, motivo')
                .gte('fecha', hoyInicio.toISOString())
                .lte('fecha', hoyFin.toISOString());

            if (errSalidas) throw errSalidas;
            
            // Solo contar las salidas que correspondan a una venta real
            const ventasHoy = salidas.filter(s => (s.motivo || 'venta').toLowerCase() === 'venta');
            document.getElementById("kpi-salidas-hoy").textContent = ventasHoy.length;

            // Para el ranking de los más vendidos, vamos a analizar los detalles históricos o del mes
            // Para que el dashboard no salga vacío al principio, traeremos los últimos detalles de salidas
            const { data: detalles, error: errDet } = await supabaseClient
                .from('salidas_detalle')
                .select('producto_id, cantidad');

            if (!errDet && detalles) {
                const agruparVentas = {};
                
                detalles.forEach(d => {
                    agruparVentas[d.producto_id] = (agruparVentas[d.producto_id] || 0) + (parseInt(d.cantidad) || 0);
                });

                // Mapear con los nombres reales de los productos
                const productosMap = {};
                productos.forEach(p => productosMap[p.id] = p.nombre);

                const ranking = Object.keys(agruparVentas).map(pid => ({
                    nombre: productosMap[pid] || 'Producto Desconocido',
                    ventas: agruparVentas[pid]
                })).sort((a,b) => b.ventas - a.ventas).slice(0, 5); // Los 5 mejores

                const tbodyMasVendidos = document.getElementById("tbody-mas-vendidos");
                tbodyMasVendidos.innerHTML = "";

                if(ranking.length === 0) {
                    tbodyMasVendidos.innerHTML = `<tr><td colspan="2" class="text-center text-muted">No hay registros de ventas.</td></tr>`;
                } else {
                    ranking.forEach(item => {
                        const tr = document.createElement("tr");
                        tr.innerHTML = `
                            <td>${item.nombre}</td>
                            <td class="text-right bold">${item.ventas}</td>
                        `;
                        tbodyMasVendidos.appendChild(tr);
                    });
                }
            }

        } catch (error) {
            console.error("Error cargando métricas del dashboard:", error);
        }
    }

    // Ejecutar la carga automática de datos
    inicializarDashboard();
});