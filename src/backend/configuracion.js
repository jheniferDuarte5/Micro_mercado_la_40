document.addEventListener("DOMContentLoaded", () => {
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const elPerfil = document.getElementById('nombre-usuario');
    if (elPerfil) elPerfil.textContent = nombre;
    // Inicializar iconos de Lucide
    lucide.createIcons();

    const form = document.getElementById("form-configuracion");
    const btnRestablecer = document.getElementById("btn-restablecer");

    // Validaciones básicas de campos de seguridad antes de procesar
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const passCurrent = document.getElementById("pass-current").value;
        const passNew = document.getElementById("pass-new").value;
        const passConfirm = document.getElementById("pass-confirm").value;

        // Si intentó rellenar algún campo de credenciales
        if (passCurrent || passNew || passConfirm) {
            if (!passCurrent) {
                alert("Por favor, ingresa tu contraseña actual para realizar modificaciones de seguridad.");
                return;
            }
            if (passNew.length < 8) {
                alert("La nueva contraseña debe tener al menos 8 caracteres.");
                return;
            }
            if (passNew !== passConfirm) {
                alert("La confirmación no coincide con la nueva contraseña establecida.");
                return;
            }
        }

        // Simulación de guardado exitoso
        Swal.fire({
            text: `¡Configuración guardada correctamente! Los parámetros globales han sido actualizados.`,
            icon: 'success',
            confirmButtonColor: '#437c43',
        })

        // Aquí podrás mapear las variables a tu cliente de Supabase para actualizar metadatos o tablas de la empresa.
    });

    // Opción para restaurar los inputs del formulario a su estado por defecto
    btnRestablecer.addEventListener("click", () => {
        Swal.fire({
            title: 'Restablecer cambios',
            text: '¿Deseas descartar las modificaciones actuales y restaurar los valores iniciales?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#437c43',
            cancelButtonColor: '#6d6d6dff',
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                form.reset();
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