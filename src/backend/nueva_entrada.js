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
            .select('id, nombre, precio_venta,precio_compra, categoria, stock,proveedor_id,proveedores(nombre)');

        if (error) {
            console.error('Error al cargar productos:', error);
            return [];
        }

        return data;
    }

    async function cargarProductos() {
        productosDisponibles = await syncProductos();
        const selects = document.querySelectorAll(".select-product"); // Corregido: querySelectorAll en lugar de getElementById
        selects.forEach(select => {
            // Limpiar opciones anteriores excepto la primera de placeholder
            select.innerHTML = '<option value="" disabled selected>Selecciona producto</option>';
            productosDisponibles.forEach(producto => {
                const option = document.createElement("option");
                option.value = producto.id;
                option.text = producto.nombre;
                option.setAttribute("data-price", producto.precio_compra);
                option.setAttribute("data-category", producto.categoria || "");
                option.setAttribute("data-proveedor-id", producto.proveedor_id || "");

                const provNombre = producto.proveedores
                    ? (Array.isArray(producto.proveedores) ? (producto.proveedores[0]?.nombre || "") : (producto.proveedores.nombre || ""))
                    : "";
                option.setAttribute("data-proveedor", provNombre);
                select.add(option);
            });
        });
    }

    // Obtener el siguiente número de entrada
    const numEntradaInput = document.getElementById("num-entrada");
    // Establecer el siguiente número de entrada al cargar
    numEntradaInput.value = await obtenerSiguienteNumEntrada();
    // Función para obtener el siguiente número de entrada
    async function obtenerSiguienteNumEntrada() {
        const { data, error } = await supabaseClient
            .from('entradas_cabecera')
            .select('numero_entrada')
            .order('numero_entrada', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error al obtener siguiente número de entrada:', error);
            return 'ENT-0001';
        }

        if (data && data.length > 0) {
            const ultimoNum = data[0].numero_entrada;
            const match = ultimoNum.match(/ENT-(\d+)/);
            if (match) {
                const numero = parseInt(match[1]);
                return `ENT-${(numero + 1).toString().padStart(4, '0')}`;
            }
        }

        return 'ENT-0001';
    }

    const tbody = document.getElementById("products-tbody");
    const btnAddItem = document.getElementById("btn-add-item");
    const grandTotalSpan = document.getElementById("grand-total");
    const form = document.getElementById("form-nueva-entrada");

    function formatMoney(amount) {
        return amount.toLocaleString('es-CO');
    }

    // Calcula los subtotales por fila (Cantidad x Precio Compra) y el Gran Total
    function calcularTotales() {
        let totalEntrada = 0;
        const rows = tbody.querySelectorAll("tr");

        rows.forEach(row => {
            const idProducto = row.querySelector(".input-id");
            const select = row.querySelector(".select-product");
            const qtyInput = row.querySelector(".input-qty");
            const unitPriceSpan = row.querySelector(".unit-price");
            const rowTotalSpan = row.querySelector(".row-total");
            const numEntradaInput = document.getElementById("num-entrada");

            const selectedOption = select.options[select.selectedIndex];
            const price = selectedOption && selectedOption.value ? parseFloat(selectedOption.getAttribute("data-price")) : 0;
            const qty = parseFloat(qtyInput.value) || 0;

            const subtotal = price * qty;
            totalEntrada += subtotal;

            unitPriceSpan.textContent = formatMoney(price);
            rowTotalSpan.textContent = formatMoney(subtotal);
        });

        grandTotalSpan.textContent = formatMoney(totalEntrada);

    };

    // Escuchar cambios reactivos en los selectores de producto o inputs de cantidad
    tbody.addEventListener("change", (e) => {
        if (e.target.classList.contains("select-product")) {
            const row = e.target.closest("tr");

            // Sincronizar el input-id con el valor del producto seleccionado
            const idInput = row.querySelector(".input-id");
            if (idInput) {
                idInput.value = e.target.value;
            }

            // Sincronizar el proveedor de la fila
            const selectedOption = e.target.options[e.target.selectedIndex];
            const provInput = row.querySelector(".input-proveedor");
            if (provInput && selectedOption) {
                const proveedorNombre = selectedOption.getAttribute("data-proveedor") || "";
                provInput.value = proveedorNombre;
            }

            // Auto-seleccionar el proveedor general del formulario
            if (selectedOption) {
                const proveedorId = selectedOption.getAttribute("data-proveedor-id");
                if (proveedorId) {
                    const proveedorSelect = document.getElementById("proveedor");
                    if (proveedorSelect) {
                        proveedorSelect.value = proveedorId;
                    }
                }
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
                        // Disparar evento change programáticamente para actualizar proveedor y totales
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
                if (!found) {
                    select.selectedIndex = 0; // Deseleccionar si no coincide
                    const provInput = row.querySelector(".input-proveedor");
                    if (provInput) provInput.value = "";
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
            const provNombre = producto.proveedores
                ? (Array.isArray(producto.proveedores) ? (producto.proveedores[0]?.nombre || "") : (producto.proveedores.nombre || ""))
                : "";
            optionsHtml += `<option value="${producto.id}" data-price="${producto.precio_compra}" data-category="${producto.categoria || ""}" data-proveedor-id="${producto.proveedor_id || ""}" data-proveedor="${provNombre}">${producto.nombre}</option>`;
        });

        newRow.innerHTML = `
            <td>
                <input type="text" class="input-id" >
            </td>
            <td> 
                <div class="select-wrapper">
                    <select class="select-product">
                        ${optionsHtml}
                    </select>
                </div>
            </td>
            <td>
                <input type="text" class="input-proveedor" readonly>
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
        tbody.appendChild(newRow);
        lucide.createIcons(); // Volver a procesar iconos insertados
    });

    // Envío e integración del Formulario (CORREGIDO)
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const numEntrada = document.getElementById("num-entrada").value;

        // 1. Validar productos, calcular total y armar el array de detalles
        const rows = tbody.querySelectorAll("tr");
        const fechaActual = new Date().toISOString();
        let totalEntrada = 0;
        let productosAInsertar = []; 
        let proveedor_id = [];

        rows.forEach(row => {
            const select = row.querySelector(".select-product");
            const qtyInput = row.querySelector(".input-qty");
            
            const selectedOption = select && select.options[select.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const cantidad = qtyInput ? (parseFloat(qtyInput.value) || 0) : 0;
                const precioCompra = parseFloat(selectedOption.getAttribute("data-price")) || 0;
                const productoId = selectedOption.value; // El ID de barra (TEXT)

                if (cantidad > 0) {
                    totalEntrada += (cantidad * precioCompra);
                    
                    // Guardamos el detalle estructurado para el segundo INSERT
                    productosAInsertar.push({
                        producto_id: productoId,
                        cantidad: cantidad,
                        precio_compra: precioCompra
                    });
                    proveedor_id.push(selectedOption.getAttribute("data-proveedor-id"));
                }
            }
        });

        if (productosAInsertar.length === 0) {
            Swal.fire({
                title: 'La entrada debe contener al menos un producto válido y con cantidad mayor a 0',
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
        
        const cabeceraObjeto = [];
        for (let i = 0; i < proveedor_id.length; i++) {
             cabeceraObjeto.push({
            numero_entrada: numEntrada, 
            fecha: fechaActual,
            proveedor_id: proveedor_id[i],
            usuario_id: usuario_id,
            total: totalEntrada
             });
            console.log(cabeceraObjeto[i]);
        }
       

        Swal.fire({
            title: '¿Estás seguro de que deseas guardar esta entrada?',
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
                        .from('entradas_cabecera')
                        .insert(cabeceraObjeto)
                        .select(); // <-- CRÍTICO para obtener el ID de vuelta

                    if (errorCabecera) throw errorCabecera;

                    // Obtener el ID de la cabecera que se acaba de crear
                    const entradaCabeceraId = cabeceraGuardada[0].id; 

                    // 3. Mapear los detalles agregándoles el id de la cabecera parental
                    const detallesFinales = productosAInsertar.map(det => ({
                        entrada_id: entradaCabeceraId, // Relación FK a entradas_cabecera
                        producto_id: det.producto_id,
                        cantidad: det.cantidad,
                        precio_compra: det.precio_compra
                    }));

                    // 4. Insertar los DETALLES en lote (Bulk Insert)
                    const { error: errorDetalles } = await supabaseClient
                        .from('entradas_detalle') // Asegúrate de que tu tabla se llame así
                        .insert(detallesFinales);

                    if (errorDetalles) throw errorDetalles;

                    // 5. Éxito rotundo
                    Swal.fire({
                        title: '¡Guardado con éxito!',
                        text: `La entrada ${numEntrada} y sus productos han sido registrados.`,
                        icon: 'success',
                        confirmButtonColor: '#437c43',
                    }).then(async () => {
                        // Limpiar formulario y actualizar el número de la siguiente entrada
                        form.reset();
                        numEntradaInput.value = await obtenerSiguienteNumEntrada();
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

