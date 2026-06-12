import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;

    lucide.createIcons();

    const tbody = document.getElementById("table-body");
    const searchInput = document.getElementById("search-user");
    const filterRole = document.getElementById("filter-role");
    const btnNuevoUsuario = document.getElementById("btn-nuevo-usuario");

    // Referencias a los KPIs
    const kpiTotal = document.getElementById("kpi-total");
    const kpiAdmin = document.getElementById("kpi-admin");
    const kpiEmp = document.getElementById("kpi-emp");

    let usuariosList = [];

    // 1. Cargar usuarios desde Supabase
    async function cargarUsuarios() {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error al cargar usuarios:", error);
            Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
            return;
        }

        usuariosList = data || [];
        actualizarKPIs();
        renderUsuarios();
    }

    // 2. Actualizar las tarjetas de la parte superior
    function actualizarKPIs() {
        kpiTotal.textContent = usuariosList.length;
        kpiAdmin.textContent = usuariosList.filter(u => u.rol === 'Administrador').length;
        kpiEmp.textContent = usuariosList.filter(u => u.rol === 'Empleado').length;
    }

    // 3. Renderizar y filtrar la tabla en tiempo real
    function renderUsuarios() {
        const searchTerm = searchInput.value.toLowerCase();
        const roleFilter = filterRole.value;

        tbody.innerHTML = '';

        const filtrados = usuariosList.filter(u => {
            const matchesSearch = u.nombre.toLowerCase().includes(searchTerm) || 
                                  u.correo.toLowerCase().includes(searchTerm);
            const matchesRole = roleFilter === 'todos' || u.rol === roleFilter;
            return matchesSearch && matchesRole;
        });

        if (filtrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No se encontraron usuarios que coincidan con la búsqueda.</td></tr>';
            return;
        }

        filtrados.forEach(user => {
            // Estilos de acuerdo al rol y al estado (activo/inactivo)
            const roleClass = user.rol === 'Administrador' ? 'role-admin' : 'role-employee';
            const btnClass = user.estado ? 'btn-disable' : 'btn-enable';
            const btnText = user.estado ? 'Deshabilitar' : 'Habilitar';
            const rowClass = user.estado ? '' : 'style="opacity: 0.5;"'; // Opacidad bajita si está inactivo

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="bold" ${rowClass}>${user.nombre}</td>
                <td ${rowClass}>${user.correo}</td>
                <td ${rowClass}>${user.telefono || 'Sin registrar'}</td>
                <td ${rowClass}><span class="role-badge ${roleClass}">${user.rol}</span></td>
                <td class="text-center" style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn-action ${btnClass}" data-id="${user.id}" data-estado="${user.estado}">
                        ${btnText}
                    </button>
                    <button class="btn-action btn-edit" data-id="${user.id}" style="background-color: #b3e2b3ff; border-color: #b3e2b3ff;">
                        Editar
                    </button>
                </td>
                
            `;
            tbody.appendChild(tr);
        });
    }

    // Escuchar eventos de búsqueda
    searchInput.addEventListener("input", renderUsuarios);
    filterRole.addEventListener("change", renderUsuarios);

    // 4. Habilitar/Deshabilitar y Editar Usuarios
    tbody.addEventListener("click", async (e) => {
        if (e.target.classList.contains("btn-edit")) {
            const userId = e.target.getAttribute("data-id");
            const user = usuariosList.find(u => u.id == userId);
            if (!user) return;

            const { value: formValues } = await Swal.fire({
                title: 'Editar Usuario',
                html: `
                    <div style="display:flex; flex-direction:column; gap: 12px; text-align: left; margin-top: 10px;">
                        <div>
                            <label style="font-size: 13px; font-weight: bold; color: #437c43;">Nombre Completo *</label>
                            <input id="edit-nombre" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" value="${user.nombre}">
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: bold; color: #437c43;">Correo Electrónico *</label>
                            <input id="edit-correo" type="email" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" value="${user.correo}">
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: bold; color: #437c43;">Teléfono</label>
                            <input id="edit-telefono" type="text" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" value="${user.telefono || ''}">
                        </div>
                        <div style="display:flex; gap: 15px;">
                            <div style="flex: 1;">
                                <label style="font-size: 13px; font-weight: bold; color: #437c43;">Rol en el Sistema *</label>
                                <select id="edit-rol" class="swal2-select" style="width: 100%; margin: 5px 0 0 0; padding: 0 10px; height: 3.3rem;">
                                    <option value="Administrador" ${user.rol === 'Administrador' ? 'selected' : ''}>Administrador</option>
                                    <option value="Empleado" ${user.rol === 'Empleado' ? 'selected' : ''}>Empleado</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label style="font-size: 13px; font-weight: bold; color: #437c43;">Contraseña (Opcional)</label>
                                <input id="edit-password" type="password" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" placeholder="Dejar vacío para mantener">
                            </div>
                        </div>
                    </div>
                `,
                width: '600px',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: '#437c43',
                cancelButtonColor: '#6d6d6d',
                confirmButtonText: '<i data-lucide="save"></i> Guardar Cambios',
                cancelButtonText: 'Cancelar',
                didOpen: () => {
                    lucide.createIcons();
                },
                preConfirm: () => {
                    const nombre = document.getElementById('edit-nombre').value.trim();
                    const correo = document.getElementById('edit-correo').value.trim();
                    const telefono = document.getElementById('edit-telefono').value.trim();
                    const rol = document.getElementById('edit-rol').value;
                    const password = document.getElementById('edit-password').value.trim();

                    if (!nombre || !correo || !rol) {
                        Swal.showValidationMessage('Por favor completa todos los campos obligatorios (*).');
                        return false;
                    }

                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(correo)) {
                        Swal.showValidationMessage('El formato del correo electrónico es inválido.');
                        return false;
                    }

                    if (password && password.length < 6) {
                        Swal.showValidationMessage('La contraseña debe tener un mínimo de 6 caracteres.');
                        return false;
                    }

                    const updateData = { nombre, correo: correo.toLowerCase(), telefono: telefono || null, rol };
                    if (password) updateData.password = password;

                    return updateData;
                }
            });

            if (formValues) {
                Swal.fire({
                    title: 'Actualizando usuario...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                const { error } = await supabaseClient
                    .from('usuarios')
                    .update(formValues)
                    .eq('id', userId);

                if (error) {
                    if (error.code === '23505') {
                        Swal.fire('Atención', 'Ya existe un usuario registrado usando este correo electrónico.', 'warning');
                    } else {
                        Swal.fire('Error', `Ocurrió un error inesperado: ${error.message}`, 'error');
                    }
                } else {
                    Swal.fire({
                        title: '¡Actualizado!',
                        text: 'Los datos del usuario han sido modificados correctamente.',
                        icon: 'success',
                        confirmButtonColor: '#437c43'
                    });
                    cargarUsuarios(); // Refrescar la tabla
                }
            }
        } else if (e.target.classList.contains("btn-action")) {
            const userId = e.target.getAttribute("data-id");
            const estadoActual = e.target.getAttribute("data-estado") === 'true';
            const nuevoEstado = !estadoActual;
            const accionTxt = nuevoEstado ? 'habilitar' : 'deshabilitar';
            const colorConfirm = nuevoEstado ? '#437c43' : '#d33';

            const { isConfirmed } = await Swal.fire({
                title: `¿Estás seguro de ${accionTxt} este acceso?`,
                text: nuevoEstado ? 'El usuario volverá a tener acceso al sistema.' : 'El usuario ya no podrá iniciar sesión.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: colorConfirm,
                cancelButtonColor: '#6d6d6d',
                confirmButtonText: `Sí, ${accionTxt}`,
                cancelButtonText: 'Cancelar'
            });

            if (isConfirmed) {
                const { error } = await supabaseClient
                    .from('usuarios')
                    .update({ estado: nuevoEstado })
                    .eq('id', userId);

                if (error) {
                    Swal.fire('Error', `Hubo un error: ${error.message}`, 'error');
                } else {
                    Swal.fire({
                        title: '¡Actualizado!',
                        text: `El usuario ha sido ${nuevoEstado ? 'habilitado' : 'deshabilitado'}.`,
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    cargarUsuarios(); // Recargar la tabla automáticamente
                }
            }
        }
    });

    // 5. Añadir Nuevo Usuario mediante MODAL (SweetAlert2)
    btnNuevoUsuario.addEventListener("click", async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Registrar Nuevo Usuario',
            html: `
                <div style="display:flex; flex-direction:column; gap: 12px; text-align: left; margin-top: 10px;">
                    <div>
                        <label style="font-size: 13px; font-weight: bold; color: #437c43;">Nombre Completo *</label>
                        <input id="swal-nombre" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" placeholder="Ej. Juan Pérez">
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: bold; color: #437c43;">Correo Electrónico *</label>
                        <input id="swal-correo" type="email" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" placeholder="usuario@la40.com">
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: bold; color: #437c43;">Teléfono</label>
                        <input id="swal-telefono" type="text" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" placeholder="300 000 0000">
                    </div>
                    <div style="display:flex; gap: 15px;">
                        <div style="flex: 1;">
                            <label style="font-size: 13px; font-weight: bold; color: #437c43;">Rol en el Sistema *</label>
                            <select id="swal-rol" class="swal2-select" style="width: 100%; margin: 5px 0 0 0; padding: 0 10px; height: 3.3rem;">
                                <option value="" disabled selected>Elegir Rol</option>
                                <option value="Administrador">Administrador</option>
                                <option value="Empleado">Empleado</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 13px; font-weight: bold; color: #437c43;">Contraseña *</label>
                            <input id="swal-password" type="password" class="swal2-input" style="width: 100%; margin: 5px 0 0 0;" placeholder="••••••••">
                        </div>
                    </div>
                </div>
            `,
            width: '600px', // Hacer el modal más ancho para acomodar todo elegantemente
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#437c43',
            cancelButtonColor: '#6d6d6d',
            confirmButtonText: '<i data-lucide="user-plus"></i> Crear Cuenta',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                // Renderizar íconos de lucide dentro del modal si es necesario
                lucide.createIcons();
            },
            preConfirm: () => {
                // Validación antes de cerrar el modal
                const nombre = document.getElementById('swal-nombre').value.trim();
                const correo = document.getElementById('swal-correo').value.trim();
                const telefono = document.getElementById('swal-telefono').value.trim();
                const rol = document.getElementById('swal-rol').value;
                const password = document.getElementById('swal-password').value.trim();

                if (!nombre || !correo || !rol || !password) {
                    Swal.showValidationMessage('Por favor completa todos los campos obligatorios (*).');
                    return false;
                }

                // Expresión regular para validar formato de correo
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(correo)) {
                    Swal.showValidationMessage('El formato del correo electrónico es inválido.');
                    return false;
                }

                if (password.length < 6) {
                    Swal.showValidationMessage('La contraseña debe tener un mínimo de 6 caracteres.');
                    return false;
                }

                return { nombre, correo, telefono, rol, password };
            }
        });

        // Si la validación es correcta y el usuario presiona "Crear Cuenta"
        if (formValues) {
            Swal.fire({
                title: 'Creando cuenta...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            // Intentar Inserción en la base de datos Supabase
            const { error } = await supabaseClient
                .from('usuarios')
                .insert([{
                    nombre: formValues.nombre,
                    correo: formValues.correo.toLowerCase(),
                    telefono: formValues.telefono || null,
                    rol: formValues.rol,
                    password: formValues.password,
                    estado: true // Activo por defecto
                }]);

            if (error) {
                console.error("Error BD:", error);
                // Si el error es por duplicado de correo (código PostgreSQL 23505 = unique_violation)
                if (error.code === '23505') {
                    Swal.fire('Atención', 'Ya existe un usuario registrado usando este correo electrónico.', 'warning');
                } else {
                    Swal.fire('Error', `Ocurrió un error inesperado: ${error.message}`, 'error');
                }
            } else {
                Swal.fire({
                    title: '¡Usuario Creado!',
                    text: `El acceso para ${formValues.nombre} ha sido configurado correctamente.`,
                    icon: 'success',
                    confirmButtonColor: '#437c43'
                });
                cargarUsuarios(); // Refrescar la tabla
            }
        }
    });

    // Acción del botón Cerrar Sesión
    const logoutBtn = document.querySelector(".logout-btn");
    if(logoutBtn) {
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

    // Arranque Inicial
    cargarUsuarios();
});