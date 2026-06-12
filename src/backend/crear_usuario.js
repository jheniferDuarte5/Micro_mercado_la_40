// registro.js - LÓGICA PARA CREAR CUENTAS NUEVAS

// 1. Importamos la conexión única desde nuestro archivo maestro
import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar los iconos de Lucide en la vista de registro
    lucide.createIcons();

    const formRegistro = document.getElementById("form-registro");

    formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 2. Capturar los valores de los inputs del formulario
        const nombre = document.getElementById("reg-nombre").value;
        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;
        const telefono = document.getElementById("reg-telefono").value;

        // Validación básica en el frontend

        if (password.length < 8) {
            alert("La contraseña debe tener al menos 8 caracteres.");
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('usuarios')
                .insert([
                    {
                        nombre: nombre,
                        correo: email,
                        rol: "Empleado",
                        password: password, // Validación por consulta directa
                        telefono: telefono,
                        estado: true           // Todo usuario nuevo inicia activo por defecto
                    }
                ]);

            if (error) throw error;

            // 4. Si el registro es exitoso, notificamos y redirigimos al login
            Swal.fire({
                text: `¡Cuenta creada con éxito para ${nombre}! Ya puedes iniciar sesión.`,
                icon: 'success',
                confirmButtonColor: '#437c43',
            })
            window.location.href = "../../../index.html";

        } catch (error) {
            console.error("Error en el registro:", error.message);
            
            // Manejo de error común: Si el correo ya existe en la base de datos
            if (error.message.includes("unique constraint") || error.code === "23505") {
                Swal.fire({
                    text: `Este correo electrónico ya se encuentra registrado.`,
                    icon: 'error',
                    confirmButtonColor: '#437c43',
                })
            } else {
                Swal.fire({
                    text: `Hubo un problema al registrar la cuenta: ${error.message}`,
                    icon: 'error',
                    confirmButtonColor: '#437c43',
                })
            }
        }
    });
});