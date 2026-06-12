import { supabaseClient } from './conexion.js';
document.addEventListener("DOMContentLoaded", async () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    // Inicializar los iconos de Lucide (usados en sidebar y paginación)
    lucide.createIcons();

    const tableBody = document.getElementById("table-body");

    // Cargar productos al iniciar
    const { data: productos, error } = await supabaseClient.from('productos').select('*');
    if (error) return console.error('Error al cargar productos:', error);
    
    // Llenar la tabla con productos
    productos.forEach(producto => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${producto.id}</td>
            <td>${producto.nombre}</td>
            <td>${producto.categoria}</td>
            <td>${producto.stock}</td>
            <td>${producto.estado ? '<span class="status-badge active">Activo</span>' : '<span class="status-badge inactive">Inactivo</span>'}</td>
            <td class="text-center">
                ${producto.estado ? '<button class="btn-action btn-disable" data-id="${producto.id}">Deshabilitar</button>' : '<button class="btn-action btn-enable" data-id="${producto.id}">Habilitar</button>'}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Manejo del cambio de estado mediante delegación de eventos
    tableBody.addEventListener("click", async (e) => {
        const button = e.target.closest(".btn-action");
        if (!button) return;

        const row = button.closest("tr");
        const idProducto = row.cells[0].textContent;
        const nombreProducto = row.cells[1].textContent;
        const badgeCell = row.cells[4].querySelector(".status-badge");

        if (button.classList.contains("btn-disable")) {
            // Lógica para DESHABILITAR
            Swal.fire({
            text: `¿Estás seguro de deshabilitar el producto: ${nombreProducto}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#437c43',
            cancelButtonColor: '#6d6d6dff',
            confirmButtonText: 'Deshabilitar',
            cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await supabaseClient.from('productos').update({ estado: false }).eq('id', idProducto);
                    badgeCell.textContent = "Inactivo";
                    badgeCell.className = "status-badge inactive";

                    // Cambiar el botón a "Habilitar"
                    button.textContent = "Habilitar";
                    button.className = "btn-action btn-enable";

                    Swal.fire({
                        text: `¡Producto "${idProducto}" deshabilitado con éxito!`,
                        icon: 'success',
                        confirmButtonColor: '#437c43',
                    })
                }
            });
        } else if (button.classList.contains("btn-enable")) {
            Swal.fire({
            text: `¿Estás seguro de habilitar el producto: ${nombreProducto}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#437c43',
            cancelButtonColor: '#6d6d6dff',
            confirmButtonText: 'Habilitar',
            cancelButtonText: 'Cancelar'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await supabaseClient.from('productos').update({ estado: true }).eq('id', idProducto);
                     // Lógica para HABILITAR
                    badgeCell.textContent = "Activo";
                    badgeCell.className = "status-badge active";

                      // Cambiar el botón a "Deshabilitar"
                    button.textContent = "Deshabilitar";
                    button.className = "btn-action btn-disable";

                    Swal.fire({
                        text: `¡Producto "${idProducto}" Habilitado con éxito!`,
                        icon: 'success',
                        confirmButtonColor: '#437c43',
                    })
                }
            });
        }
    });

        document.getElementById("btn-cancelar").addEventListener("click", () => {
        window.location.href = "productos.html";
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