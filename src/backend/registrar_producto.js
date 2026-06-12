import { supabaseClient } from './conexion.js';
document.addEventListener("DOMContentLoaded", () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    // Inicializar los iconos de Lucide
    lucide.createIcons();

    // Cargar proveedores en el select dinámicamente
    async function cargarProveedores() {
        const { data: proveedores, error } = await supabaseClient
            .from('proveedores')
            .select('*');

        if (error) {
            console.error('Error al cargar proveedores:', error);
            return;
        }

        const selectProveedor = document.getElementById("proveedor");
        if (selectProveedor && proveedores) {
            // Limpiamos (dejando el placeholder)
            selectProveedor.innerHTML = '<option value="" disabled selected>Selecciona proveedor</option>';
            proveedores.forEach(prov => {
                const option = document.createElement('option');
                option.value = prov.id;
                option.textContent = prov.nombre;
                selectProveedor.add(option);
            });
        }
    }

    async function cargarCategorias(){
        const{data,error} = await supabaseClient
            .from('productos')
            .select('categoria')
        
        if (error) {
            console.error('Error al cargar categorías:', error);
            return;
        }
        // 2. Extraemos los textos de las categorías en un array plano
        const todasLasCategorias = data.map(item => item.categoria);

        // 3. El truco de JS: Un 'Set' elimina automáticamente los duplicados
        const categoriasUnicas = [...new Set(todasLasCategorias)]

        const selectCategoria = document.getElementById("categoria");
        if (selectCategoria && data) {
            // Limpiamos (dejando el placeholder)
            selectCategoria.innerHTML = '<option value="" disabled selected>Selecciona categoría</option>';
            categoriasUnicas.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                selectCategoria.add(option);
            });
        }
    }
    cargarProveedores();
    cargarCategorias();

    const productForm = document.getElementById("product-form");
    const btnCancelar = document.getElementById("btn-cancelar");

    // Evento al enviar el formulario (Guardar Producto)
    productForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Extraer todos los valores de los inputs
        const codigoVal = document.getElementById("codigo").value.trim();
        const nombreVal = document.getElementById("nombre").value.trim();
        const medidaVal = document.getElementById("medida").value;
        const categoriaVal = document.getElementById("categoria").value;
        const proveedorVal = document.getElementById("proveedor").value;
        const stockVal = document.getElementById("stock").value.trim();
        const precioVentaVal = document.getElementById("precio-venta").value.trim();
        const precioCompraVal = document.getElementById("precio-compra").value.trim();

        // 2. Validación de campos vacíos
        if (!codigoVal || !nombreVal || !medidaVal || !categoriaVal || !proveedorVal || stockVal === "" || precioVentaVal === "" || precioCompraVal === "") {
            Swal.fire({
                title: 'Campos incompletos',
                text: 'Por favor, llena y selecciona todos los campos antes de guardar el producto.',
                icon: 'warning',
                confirmButtonColor: '#437c43'
            });
            return;
        }

        // 3. Validación de números negativos
        if (parseFloat(stockVal) < 0 || parseFloat(precioVentaVal) < 0 || parseFloat(precioCompraVal) < 0) {
            Swal.fire({
                title: 'Valores inválidos',
                text: 'El stock y los precios no pueden ser números negativos.',
                icon: 'error',
                confirmButtonColor: '#d33'
            });
            return;
        }

        // 4. Captura de datos adaptada a la estructura snake_case típica de Supabase
        const formData = {
            id: codigoVal,
            nombre: `${nombreVal} ${medidaVal}`, // Agregado un espacio para mejor lectura
            categoria: categoriaVal,
            stock: parseFloat(stockVal),
            precio_venta: parseFloat(precioVentaVal),
            precio_compra: parseFloat(precioCompraVal),
            proveedor_id: proveedorVal,
            estado: document.querySelector('input[name="estado"]:checked').value === "activo" || document.querySelector('input[name="estado"]:checked').value === "true" || document.querySelector('input[name="estado"]:checked').value === "1",
            created_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('productos')
            .insert([formData]);

        if (error) {
            console.error('Error al registrar producto:', error);
            Swal.fire({
                title: 'Error',
                text: `No se pudo registrar el producto: ${error.message}`,
                icon: 'error',
                confirmButtonColor: '#d33',
            });
        } else {
            console.log("Producto guardado:", formData);
            Swal.fire({
                title: '¡Guardado!',
                text: `El producto "${formData.nombre}" ha sido registrado con éxito.`,
                icon: 'success',
                confirmButtonColor: '#437c43',
            }).then(() => {
                productForm.reset();
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