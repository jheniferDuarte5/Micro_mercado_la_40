import { supabaseClient } from './conexion.js';
/* =========================================
   MICROMERCADO LA 40 – Login Script
   ========================================= */

(function () {
  'use strict';

  /* ---- Referencias al DOM ---- */
  const btnLogin = document.getElementById('btnLogin');
  const inputUser = document.getElementById('usuario');
  const inputPass = document.getElementById('contrasena');
  const togglePass = document.getElementById('togglePass');
  const eyeIcon = document.getElementById('eyeIcon');
  const feedback = document.getElementById('loginFeedback');
  const checkRemember = document.getElementById('recordarme');

  /* =========================================
     1. MOSTRAR / OCULTAR CONTRASEÑA
     ========================================= */
  togglePass.addEventListener('click', function () {
    const isPassword = inputPass.type === 'password';
    inputPass.type = isPassword ? 'text' : 'password';
    // Actualizar ícono
    eyeIcon.innerHTML = isPassword
      ? /* ojo tachado */
      `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12
           a10.05 10.05 0 0 1 5.17-5.65M9.9 4.24A9.12 9.12 0 0 1 12 4
           c5 0 9.27 3.61 11 8a10.1 10.1 0 0 1-2.05 3.37"
           stroke="#9cbbad" stroke-width="1.8" fill="none" stroke-linecap="round"/>
         <line x1="1" y1="1" x2="23" y2="23"
           stroke="#9cbbad" stroke-width="1.8" stroke-linecap="round"/>`
      : /* ojo abierto */
      `<path d="M1 12 C4 6 20 6 23 12 C20 18 4 18 1 12Z"
           stroke="#9cbbad" stroke-width="1.8" fill="none"/>
         <circle cx="12" cy="12" r="3"
           stroke="#9cbbad" stroke-width="1.8" fill="none"/>`;
  });

  /* =========================================
     2. RECORDARME – persistir usuario
     ========================================= */
  // Al cargar: recuperar usuario si fue guardado

  /* =========================================
     3. HELPERS DE FEEDBACK
     ========================================= */
  function showFeedback(msg, type) {
    feedback.textContent = msg;
    feedback.className = 'login-feedback ' + type;
  }
  function clearFeedback() {
    feedback.textContent = '';
    feedback.className = 'login-feedback';
  }

  function shakeCard() {
    const card = document.querySelector('.form-card');
    card.classList.remove('shake');
    // forzar reflow para reiniciar animación
    void card.offsetWidth;
    card.classList.add('shake');
  }

  /* =========================================
     4. VALIDACIÓN BÁSICA
     ========================================= */
  function validate() {
    const user = inputUser.value.trim();
    const pass = inputPass.value.trim();

    if (!user) {
      showFeedback('Por favor ingresa tu usuario.', 'error');
      inputUser.focus();
      return false;
    }
    if (!pass) {
      showFeedback('Por favor ingresa tu contraseña.', 'error');
      inputPass.focus();
      return false;
    }
    if (pass.length < 4) {
      showFeedback('La contraseña debe tener al menos 4 caracteres.', 'error');
      inputPass.focus();
      return false;
    }
    return true;
  }



  /* =========================================
     6. CLICK EN "INICIAR SESIÓN"
     ========================================= */
  btnLogin.addEventListener('click', async function () {
    clearFeedback();

    if (!validate()) {
      shakeCard();
      return;
    }

    const user = inputUser.value.trim();
    const pass = inputPass.value.trim();

    console.log(user, pass);
    // Estado de carga
    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando…';
    showFeedback('Iniciando sesión, por favor espera…', 'loading');



    try {

      const { data: usuario, error } = await supabaseClient
        .from('usuarios')
        .select('id, rol,nombre,estado')
        .eq('correo', user)
        .eq('password', pass)
        .eq('estado', true)
        
      if (error) throw error;
      if (usuario.length === 0) {
        Swal.fire({
          text: `Acceso denegado: Correo o contraseña incorrectos, o usuario inactivo.`,
          icon: 'error',
          confirmButtonColor: '#437c43',
        });
        
        return;
      }
      console.log(usuario);
      const usuarioLogueado = usuario[0];
      localStorage.setItem("nombre", usuarioLogueado.nombre);
      localStorage.setItem("usuario", JSON.stringify(usuario[0]));
      console.log(usuario[0]);
      showFeedback('✓ Acceso concedido. Redirigiendo…', 'loading');
      Swal.fire({
        text: `¡Bienvenido, ${usuarioLogueado.nombre}!`,
        icon: 'success',
        confirmButtonColor: '#437c43',
      }).then((result) => {
        if (result.isConfirmed) {
          clearFeedback();
          
          switch (usuarioLogueado.rol) {
        case "Administrador":
          window.location.href = "src/frontend/pages/dashboard.html";
          break;
        case "Empleado":
          window.location.href = "src/frontend/pages/dashboard_emp.html";
          break;
        default:
          break;
      }
        }
      });

    } catch (error) {
      showFeedback('Usuario o contraseña incorrectos.', 'error');
      shakeCard();
      inputPass.value = '';
      inputPass.focus();
    } finally {
      // Restaurar botón
      btnLogin.disabled = false;
      btnLogin.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
            stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <polyline points="10 17 15 12 10 7"
            stroke="white" stroke-width="2" fill="none"
            stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="15" y1="12" x2="3" y2="12"
            stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Iniciar sesión`;
    }
  });

  /* =========================================
     7. ENTER en los campos
     ========================================= */
  [inputUser, inputPass].forEach(el => {
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') btnLogin.click();
    });
    // Limpiar feedback al escribir
    el.addEventListener('input', clearFeedback);
  });

  /* =========================================
     8. ENLACE "¿Olvidaste tu contraseña?"
     ========================================= */
  const forgotLink = document.querySelector('.forgot-link');
  forgotLink.addEventListener('click', function (e) {
    // e.preventDefault();
    // const user = inputUser.value.trim();
    // if (user) {
    //   alert('Se enviará un correo de recuperación para: ' + user);
    // } else {
    //   alert('Ingresa tu usuario primero para recuperar tu contraseña.');
    //   inputUser.focus();
    // }
  });

})();