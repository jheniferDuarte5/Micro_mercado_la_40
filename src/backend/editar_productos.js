import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", async () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    // Inicializar los iconos de Lucide
    lucide.createIcons();

    const editForm = document.getElementById("edit-product-form");
    const btnCancelar = document.getElementById("btn-cancelar");

    // 1. Obtener el ID del producto desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        Swal.fire({
            title: 'Error',
            text: 'No se especificó un producto para editar.',
            icon: 'error'
        }).then(() => {
            window.location.href = "productos.html";
        });
        return;
    }

    // 2. Funciones para cargar selects dinámicos (igual que en registrar)
    async function cargarProveedores() {
        const { data: proveedores, error } = await supabaseClient.from('proveedores').select('*');
        if (error) return console.error('Error al cargar proveedores:', error);
        
        const selectProveedor = document.getElementById("proveedor");
        if (selectProveedor && proveedores) {
            selectProveedor.innerHTML = '<option value="" disabled selected>Selecciona proveedor</option>';
            proveedores.forEach(prov => {
                const option = document.createElement('option');
                option.value = prov.id;
                option.textContent = prov.nombre;
                selectProveedor.add(option);
            });
        }
    }

    async function cargarCategorias() {
        const { data, error } = await supabaseClient.from('productos').select('categoria');
        if (error) return console.error('Error al cargar categorías:', error);
        
        const categoriasUnicas = [...new Set(data.map(item => item.categoria))];
        const selectCategoria = document.getElementById("categoria");
        
        if (selectCategoria && data) {
            selectCategoria.innerHTML = '<option value="" disabled selected>Selecciona categoría</option>';
            categoriasUnicas.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                selectCategoria.add(option);
            });
        }
    }

    // 3. Cargar datos del producto específico y llenar el formulario
    async function cargarDatosProducto() {
        const { data: producto, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('id', productId)
            .single();

        if (error || !producto) {
            Swal.fire('Error', 'No se pudo cargar la información del producto.', 'error').then(()=>window.location.href="productos.html");
            return;
        }

        // Llenar los campos
        document.getElementById("codigo").value = producto.id;
        document.getElementById("nombre").value = producto.nombre;
        
        // Esperamos un pequeño tiempo para asegurar que los selects ya tienen las options cargadas
        setTimeout(() => {
            if (producto.categoria) document.getElementById("categoria").value = producto.categoria;
            if (producto.proveedor_id) document.getElementById("proveedor").value = producto.proveedor_id;
        }, 100);

        document.getElementById("stock").value = producto.stock;
        document.getElementById("precio-venta").value = producto.precio_venta;
        document.getElementById("precio-compra").value = producto.precio_compra;

        // Estado (Radio buttons)
        if (producto.estado) {
            document.querySelector('input[name="estado"][value="activo"]').checked = true;
        } else {
            document.querySelector('input[name="estado"][value="inactivo"]').checked = true;
        }
    }

    // Ejecutar inicializaciones
    await cargarProveedores();
    await cargarCategorias();
    await cargarDatosProducto();
    

    // 4. Guardar los cambios (UPDATE)
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombreVal = document.getElementById("nombre").value.trim();
        const medidaVal = document.getElementById("medida").value; // Opcional en edición
        const categoriaVal = document.getElementById("categoria").value;
        const proveedorVal = document.getElementById("proveedor").value;
        const stockVal = document.getElementById("stock").value.trim();
        const precioVentaVal = document.getElementById("precio-venta").value.trim();
        const precioCompraVal = document.getElementById("precio-compra").value.trim();

        // Validaciones
        if (!nombreVal || !categoriaVal || !proveedorVal || stockVal === "" || precioVentaVal === "" || precioCompraVal === "") {
            Swal.fire('Campos incompletos', 'Por favor llena todos los campos requeridos.', 'warning');
            return;
        }

        if (parseFloat(stockVal) < 0 || parseFloat(precioVentaVal) < 0 || parseFloat(precioCompraVal) < 0) {
            Swal.fire('Valores inválidos', 'El stock y los precios no pueden ser negativos.', 'error');
            return;
        }

        // Si el usuario selecciona una medida extra, se la concatenamos. Si no, dejamos el nombre intacto.
        const nombreFinal = medidaVal ? `${nombreVal} ${medidaVal}` : nombreVal;

        const formData = {
            nombre: nombreFinal,
            categoria: categoriaVal,
            stock: parseFloat(stockVal),
            precio_venta: parseFloat(precioVentaVal),
            precio_compra: parseFloat(precioCompraVal),
            proveedor_id: proveedorVal,
            estado: document.querySelector('input[name="estado"]:checked').value === "activo"
        };

        const { error } = await supabaseClient
            .from('productos')
            .update(formData)
            .eq('id', productId);

        if (error) {
            console.error('Error al actualizar producto:', error);
            Swal.fire('Error', `No se pudo actualizar: ${error.message}`, 'error');
        } else {
            Swal.fire({
                title: '¡Actualizado!',
                text: `El producto se ha actualizado correctamente.`,
                icon: 'success',
                confirmButtonColor: '#437c43',
            }).then(() => {
                window.location.href = "productos.html";
            });
        }
    });

    // Acción del botón Cancelar
    btnCancelar.addEventListener("click", () => {
        Swal.fire({
            title: '¿Estás seguro de que deseas regresar?',
            text: '¡Se perderán los cambios!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#437c43',
            cancelButtonColor: '#6d6d6dff',
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cerrar'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "productos.html";
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