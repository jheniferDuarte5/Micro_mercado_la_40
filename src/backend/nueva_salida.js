import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", async () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    // Inicializar iconos de Lucide
    lucide.createIcons();

    // Variable global/local para almacenar los productos cargados
    let productosDisponibles = [];

    //cargar datos iniciales
    cargarProductos();

    // Cargar todos los productos desde Supabase
    async function syncProductos() {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('id, nombre, precio_venta, categoria, stock');

        if (error) {
            console.error('Error al cargar productos:', error);
            return [];
        }

        return data;
    }

    async function cargarProductos() {
        productosDisponibles = await syncProductos();
        const selects = document.querySelectorAll(".select-product");
        selects.forEach(select => {
            // Limpiar opciones anteriores excepto la primera de placeholder
            select.innerHTML = '<option value="" disabled selected>Selecciona producto</option>';
            productosDisponibles.forEach(producto => {
                const option = document.createElement("option");
                option.value = producto.id;
                option.text = producto.nombre;
                // En salidas usamos el precio de VENTA
                option.setAttribute("data-price", producto.precio_venta);
                option.setAttribute("data-category", producto.categoria || "");
                select.add(option);
            });
        });
    }

    // Obtener el siguiente número de salida
    const numSalidaInput = document.getElementById("num-salida");
    // Establecer el siguiente número de salida al cargar
    if (numSalidaInput) {
        numSalidaInput.value = await obtenerSiguienteNumSalida();
    }

    // Función para obtener el siguiente número de salida
    async function obtenerSiguienteNumSalida() {
        const { data, error } = await supabaseClient
            .from('salidas_cabecera')
            .select('numero_salida')
            .order('numero_salida', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error al obtener siguiente número de salida:', error);
            return 'SAL-0001';
        }

        if (data && data.length > 0) {
            const ultimoNum = data[0].numero_salida;
            const match = ultimoNum.match(/SAL-(\d+)/);
            if (match) {
                const numero = parseInt(match[1]);
                return `SAL-${(numero + 1).toString().padStart(4, '0')}`;
            }
        }

        return 'SAL-0001';
    }

    const tbody = document.getElementById("products-tbody");
    const btnAddItem = document.getElementById("btn-add-item");
    const grandTotalSpan = document.getElementById("grand-total");
    const form = document.getElementById("form-nueva-salida");

    function formatMoney(amount) {
        return amount.toLocaleString('es-CO');
    }

    // Calcula los subtotales por fila y el Gran Total
    function calcularTotales() {
        let totalSalida = 0;
        const rows = tbody.querySelectorAll("tr");

        rows.forEach(row => {
            const select = row.querySelector(".select-product");
            const qtyInput = row.querySelector(".input-qty");
            const unitPriceSpan = row.querySelector(".unit-price");
            const rowTotalSpan = row.querySelector(".row-total");

            const selectedOption = select && select.options[select.selectedIndex];
            const price = selectedOption && selectedOption.value ? parseFloat(selectedOption.getAttribute("data-price")) : 0;
            const qty = qtyInput ? (parseFloat(qtyInput.value) || 0) : 0;

            const subtotal = price * qty;
            totalSalida += subtotal;

            if (unitPriceSpan) unitPriceSpan.textContent = formatMoney(price);
            if (rowTotalSpan) rowTotalSpan.textContent = formatMoney(subtotal);
        });

        if (grandTotalSpan) grandTotalSpan.textContent = formatMoney(totalSalida);
    }

    // Escuchar cambios reactivos en los selectores de producto o inputs de cantidad
    tbody.addEventListener("change", (e) => {
        if (e.target.classList.contains("select-product")) {
            const row = e.target.closest("tr");
            
            // Sincronizar el input-id con el valor del producto seleccionado (si existe el campo de ID manual)
            const idInput = row.querySelector(".input-id");
            if (idInput) {
                idInput.value = e.target.value;
            }
            calcularTotales();
        } else if (e.target.classList.contains("input-qty")) {
            calcularTotales();
        }
    });

    tbody.addEventListener("input", (e) => {
        if (e.target.classList.contains("input-qty")) {
            calcularTotales();
        } else if (e.target.classList.contains("input-id")) {
            // Sincronizar el selector de producto cuando se escribe el ID a mano
            const row = e.target.closest("tr");
            const select = row.querySelector(".select-product");
            if (select) {
                const typedId = e.target.value.trim();
                let found = false;
                for (let option of select.options) {
                    if (option.value === typedId) {
                        select.value = typedId;
                        found = true;
                        // Disparar evento change programáticamente para actualizar totales
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
                if (!found) {
                    select.selectedIndex = 0; // Deseleccionar si no coincide
                    calcularTotales();
                }
            }
        }
    });

    // Eliminar una fila asegurando dejar al menos una activa
    tbody.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".btn-delete-row");
        if (!deleteBtn) return;

        const row = deleteBtn.closest("tr");
        if (tbody.querySelectorAll("tr").length > 1) {
            row.remove();
            calcularTotales();
        } else {
            Swal.fire({
                title: 'La transacción debe contener al menos un producto.',
                text: 'Acción no realizada',
                icon: 'warning',
            });
        }
    });

    // Añadir una nueva fila dinámica con la estructura limpia y productos dinámicos
    btnAddItem.addEventListener("click", () => {
        const newRow = document.createElement("tr");
        
        let optionsHtml = '<option value="" disabled selected>Selecciona producto</option>';
        productosDisponibles.forEach(producto => {
            optionsHtml += `<option value="${producto.id}" data-price="${producto.precio_venta}" data-category="${producto.categoria || ""}">${producto.nombre}</option>`;
        });

        // Verificamos si existe el input-id en el DOM para ver si lo agregamos o no a la fila
        const hasInputId = document.querySelector(".input-id") !== null;
        
        // Plantilla adaptada dinámicamente
        let htmlContent = '';
        if (hasInputId) {
            htmlContent += `
            <td>
                <input type="text" class="input-id" >
            </td>`;
        }
        
        htmlContent += `
            <td> 
                <div class="select-wrapper">
                    <select class="select-product">
                        ${optionsHtml}
                    </select>
                </div>
            </td>
            <td>
                <input type="number" class="input-qty" value="0" min="0">
            </td>
            <td>
                <div class="currency-display">$ <span class="unit-price">0</span></div>
            </td>
            <td>
                <div class="currency-total bold">$ <span class="row-total">0</span></div>
            </td>
            <td class="text-center">
                <button type="button" class="btn-delete-row" title="Eliminar fila">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;

        newRow.innerHTML = htmlContent;
        tbody.appendChild(newRow);
        lucide.createIcons(); // Volver a procesar iconos insertados
    });

    // Envío e integración del Formulario
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const numSalida = document.getElementById("num-salida").value;
        const motivoSelect = document.getElementById("motivo-salida");
        const motivo = motivoSelect ? motivoSelect.value : null;

        if (!motivo) {
            Swal.fire({
                title: 'Por favor, selecciona un motivo válido',
                icon: 'warning',
                confirmButtonColor: '#437c43'
            });
            return;
        }

        // 1. Validar productos, calcular total y armar el array de detalles
        const rows = tbody.querySelectorAll("tr");
        const fechaActual = new Date().toISOString();
        let totalSalida = 0;
        let productosAInsertar = []; 

        rows.forEach(row => {
            const select = row.querySelector(".select-product");
            const qtyInput = row.querySelector(".input-qty");
            
            const selectedOption = select && select.options[select.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const cantidad = qtyInput ? (parseFloat(qtyInput.value) || 0) : 0;
                const precioVenta = parseFloat(selectedOption.getAttribute("data-price")) || 0;
                const productoId = selectedOption.value; // El ID de barra (TEXT/UUID)

                if (cantidad > 0) {
                    totalSalida += (cantidad * precioVenta);
                    
                    // Guardamos el detalle estructurado para el segundo INSERT
                    productosAInsertar.push({
                        producto_id: productoId,
                        cantidad: cantidad,
                        precio_venta: precioVenta
                    });
                }
            }
        });

        if (productosAInsertar.length === 0) {
            Swal.fire({
                title: 'La salida debe contener al menos un producto válido y con cantidad mayor a 0',
                icon: 'warning',
                confirmButtonColor: '#437c43'
            });
            return;
        }

        // Obtener ID del usuario actual de manera segura (Asegurar formato UUID)
        const usuarioLocal = JSON.parse(localStorage.getItem("usuario"));
        if (!usuarioLocal || !usuarioLocal.id) {
            Swal.fire({
                title: 'Error de Sesión',
                text: 'No se detectó un usuario activo. Por favor inicia sesión de nuevo.',
                icon: 'error'
            });
            return;
        }
        const usuario_id = usuarioLocal.id; // Esto debe ser un UUID válido string
        
        const cabeceraObjeto = {
            numero_salida: numSalida, 
            fecha: fechaActual,
            motivo: motivo,
            usuario_id: usuario_id,
            total: totalSalida
        };

        Swal.fire({
            title: '¿Estás seguro de que deseas guardar esta salida?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#437c43',
            cancelButtonColor: '#6d6d6dff',
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // 2. Insertar CABECERA y pedir que retorne el ID generado (.select())
                    const { data: cabeceraGuardada, error: errorCabecera } = await supabaseClient
                        .from('salidas_cabecera')
                        .insert([cabeceraObjeto])
                        .select(); // <-- CRÍTICO para obtener el ID de vuelta

                    if (errorCabecera) throw errorCabecera;

                    // Obtener el ID de la cabecera que se acaba de crear
                    const salidaCabeceraId = cabeceraGuardada[0].id; 

                    // 3. Mapear los detalles agregándoles el id de la cabecera parental
                    const detallesFinales = productosAInsertar.map(det => ({
                        salida_id: salidaCabeceraId, // Relación FK a salidas_cabecera
                        producto_id: det.producto_id,
                        cantidad: det.cantidad,
                        precio_venta: det.precio_venta
                    }));

                    // 4. Insertar los DETALLES en lote (Bulk Insert)
                    const { error: errorDetalles } = await supabaseClient
                        .from('salidas_detalle') // Asegúrate de que tu tabla se llame así
                        .insert(detallesFinales);

                    if (errorDetalles) throw errorDetalles;

                    // 5. Éxito rotundo
                    Swal.fire({
                        title: '¡Guardado con éxito!',
                        text: `La salida ${numSalida} y sus productos han sido registrados.`,
                        icon: 'success',
                        confirmButtonColor: '#437c43',
                    }).then(async () => {
                        // Limpiar formulario y actualizar el número de la siguiente salida
                        form.reset();
                        const numSalidaInput = document.getElementById("num-salida");
                        if(numSalidaInput) numSalidaInput.value = await obtenerSiguienteNumSalida();
                        calcularTotales();
                    });

                } catch (err) {
                    console.error("Error en la transacción:", err);
                    Swal.fire({
                        title: 'Error',
                        text: 'Hubo un problema al guardar en la base de datos: ' + err.message,
                        icon: 'error',
                        confirmButtonColor: '#437c43'
                    });
                }
            }
        });
    });

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
                window.location.href = "../../../index.html";
            }
        });    
    });
});