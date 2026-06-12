import { supabaseClient } from './conexion.js';

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    const form = document.getElementById("form-recuperar");
    const resultBox = document.getElementById("resultado-recuperacion");
    const claveText = document.getElementById("clave-encontrada");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("rec-email").value;

        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('password')
            .eq('correo', email);

        if (data && data.length > 0) {
            claveText.textContent = data[0].password;
            resultBox.classList.remove("hidden");
        } else {
            Swal.fire({
                text: `El correo no está registrado en el sistema.`,
                icon: 'error',
                confirmButtonColor: '#437c43',
            })
            resultBox.classList.add("hidden");
        }
    });
});