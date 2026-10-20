const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');

if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];

window.addEventListener('scroll', () => {
  const y = window.scrollY + 160;
  let active = 'inicio';

  sections.forEach((section) => {
    if (section.offsetTop <= y) active = section.dataset.navId || section.id;
  });

  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${active}`);
  });
}, { passive: true });

const SUPABASE_URL = 'https://qtqisnnuaygwdshenqhv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mhdseBhBlfLq7CHVxQUzhg_bmeGQsM-';

const preregistroForm = document.getElementById('preregistroForm');
const formMessage = document.getElementById('formMessage');
const submitButton = document.getElementById('submitPreregistro');
const registrationSuccess = document.getElementById('registrationSuccess');

function showFormMessage(type, message) {
  if (!formMessage) return;

  formMessage.className = `form-message ${type ? `is-${type}` : ''}`;
  formMessage.textContent = message;
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;

  submitButton.disabled = isSubmitting;
  submitButton.classList.toggle('is-loading', isSubmitting);

  const label = submitButton.querySelector('.submit-label');
  if (label) {
    label.textContent = isSubmitting ? 'ENVIANDO...' : 'ENVIAR PREREGISTRO';
  }
}


function clearValidationUI() {
  if (!preregistroForm) return;
  preregistroForm.classList.remove('was-validated');
  preregistroForm.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  preregistroForm.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
}

function updateValidationUI() {
  if (!preregistroForm) return [];

  preregistroForm.classList.add('was-validated');
  preregistroForm.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  preregistroForm.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));

  const invalidControls = [...preregistroForm.querySelectorAll('input, select, textarea')]
    .filter((control) => !control.validity.valid && control.name !== 'website');

  invalidControls.forEach((control) => {
    control.setAttribute('aria-invalid', 'true');
    const field = control.closest('.field');
    const group = control.closest('.choice-group');
    if (field) field.classList.add('is-invalid');
    if (group) group.classList.add('is-invalid');
  });

  return invalidControls;
}

function showRegistrationSuccess() {
  if (!registrationSuccess) return;
  registrationSuccess.hidden = false;
  registrationSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideRegistrationSuccess() {
  if (registrationSuccess) registrationSuccess.hidden = true;
}

if (preregistroForm) {
  preregistroForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showFormMessage('', '');
    hideRegistrationSuccess();

    const invalidControls = updateValidationUI();
    if (invalidControls.length) {
      showFormMessage('error', 'Revisa los campos marcados en rojo antes de continuar.');
      const firstInvalid = invalidControls[0];
      firstInvalid.focus({ preventScroll: true });
      const target = firstInvalid.closest('.field, .choice-group') || firstInvalid;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const formData = new FormData(preregistroForm);

    // Campo señuelo contra bots simples. Las personas no lo ven.
    if (String(formData.get('website') || '').trim()) {
      showFormMessage('success', 'Preregistro recibido.');
      preregistroForm.reset();
      return;
    }

    const payload = {
      nombre: String(formData.get('nombre') || '').trim(),
      edad: Number(formData.get('edad')),
      email: String(formData.get('email') || '').trim().toLowerCase(),
      telefono: String(formData.get('telefono') || '').trim(),
      preparatoria: String(formData.get('preparatoria') || '').trim(),
      semestre: Number(formData.get('semestre')),
      tiene_laptop: formData.get('tiene_laptop') === 'true',
      areas_interes: formData.getAll('areas_interes'),
      experiencia_programando: String(formData.get('experiencia_programando') || '')
    };

    setSubmitting(true);
    showFormMessage('info', 'Enviando tu preregistro...');

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/preregistros`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorBody = {};

        try {
          errorBody = await response.json();
        } catch {
          // Si Supabase no responde JSON, usamos el estado HTTP.
        }

        if (response.status === 409 || errorBody.code === '23505') {
          throw new Error('duplicate_email');
        }

        console.error('Supabase preregistro error:', response.status, errorBody);
        throw new Error('request_failed');
      }

      preregistroForm.reset();
      clearValidationUI();
      showFormMessage('', '');
      showRegistrationSuccess();
    } catch (error) {
      if (error.message === 'duplicate_email') {
        showFormMessage(
          'error',
          'Ese correo ya está preregistrado. Si necesitas actualizar tus datos, contáctanos.'
        );
        const emailInput = preregistroForm.querySelector('input[name="email"]');
        if (emailInput) {
          emailInput.setAttribute('aria-invalid', 'true');
          emailInput.closest('.field')?.classList.add('is-invalid');
        }
      } else {
        showFormMessage(
          'error',
          'No pudimos guardar tu preregistro. Revisa tu conexión e inténtalo de nuevo en unos momentos.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  });
}


if (preregistroForm) {
  preregistroForm.addEventListener('input', (event) => {
    hideRegistrationSuccess();
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;

    const field = control.closest('.field');
    if (field && control.validity.valid) {
      field.classList.remove('is-invalid');
      control.removeAttribute('aria-invalid');
    }

    const group = control.closest('.choice-group');
    if (group) {
      const requiredControls = [...group.querySelectorAll('input[required], select[required], textarea[required]')];
      const groupIsValid = requiredControls.length === 0 || requiredControls.every((item) => item.validity.valid);
      if (groupIsValid) {
        group.classList.remove('is-invalid');
        requiredControls.forEach((item) => item.removeAttribute('aria-invalid'));
      }
    }
  });

  preregistroForm.addEventListener('change', () => {
    if (preregistroForm.classList.contains('was-validated')) updateValidationUI();
  });
}


function getNextEventDate() {
  const now = new Date();
  const year = now.getFullYear();
  let target = new Date(year, 10, 7, 8, 0, 0, 0); // 7 noviembre, 8:00 AM

  if (target.getTime() <= now.getTime()) {
    target = new Date(year + 1, 10, 7, 8, 0, 0, 0);
  }

  return target;
}

function updateCountdown() {
  const countdown = document.getElementById('countdown');
  if (!countdown) return;

  const daysEl = document.getElementById('countdownDays');
  const hoursEl = document.getElementById('countdownHours');
  const minutesEl = document.getElementById('countdownMinutes');
  const secondsEl = document.getElementById('countdownSeconds');

  const now = new Date();
  const target = getNextEventDate();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    countdown.classList.add('countdown-ended');
    if (daysEl) daysEl.textContent = '0';
    if (hoursEl) hoursEl.textContent = '0';
    if (minutesEl) minutesEl.textContent = '0';
    if (secondsEl) secondsEl.textContent = '0';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
  if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
  if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
  if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);




const heroLayerA = document.getElementById('ultronLayerA');
const heroLayerB = document.getElementById('ultronLayerB');

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = async () => {
      try {
        if (img.decode) await img.decode();
      } catch (_) {}
      resolve(src);
    };
    img.onerror = reject;
    img.src = src;
  });
}

if (heroLayerA && heroLayerB) {
  const sets = {
    sd: {
      dim: 'assets/ultron-sd-dim.webp',
      bright: 'assets/ultron-sd-bright.webp'
    },
    hd: {
      dim: 'assets/ultron-hd-dim.png',
      bright: 'assets/ultron-hd-bright.png'
    }
  };

  let activeSet = sets.sd;
  let hdReady = false;
  let hdActivated = false;
  let pulseTimer = null;

  // La imagen tenue siempre queda como base. La imagen brillante sólo se mezcla encima.
  heroLayerA.src = activeSet.dim;
  heroLayerB.src = activeSet.bright;
  heroLayerA.style.opacity = '1';
  heroLayerB.style.opacity = '0';

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function activateHdWhenIdle() {
    if (!hdReady || hdActivated) return;

    activeSet = sets.hd;
    heroLayerA.src = activeSet.dim;
    heroLayerB.src = activeSet.bright;
    hdActivated = true;
  }

  function schedulePulse() {
    // La siguiente subida de brillo reaparece en un momento impredecible entre 0 y 2 s.
    const waitMs = Math.round(randomBetween(0, 2000));

    pulseTimer = window.setTimeout(() => {
      activateHdWhenIdle();

      // La imagen brillante nunca llega a 100%: sólo aporta entre 20% y 30%.
      const peakOpacity = randomBetween(0.20, 0.30);

      // Duración total de la animación: aleatoria entre 0 y 1 s.
      // Se divide en subida y bajada para mantener un pulso suave.
      const totalDuration = Math.round(randomBetween(80, 1000));
      const fadeInMs = Math.max(40, Math.round(totalDuration * 0.5));
      const fadeOutMs = Math.max(40, totalDuration - fadeInMs);

      heroLayerB.style.transition = `opacity ${fadeInMs}ms ease-in-out`;
      heroLayerB.style.opacity = peakOpacity.toFixed(3);

      window.setTimeout(() => {
        heroLayerB.style.transition = `opacity ${fadeOutMs}ms ease-in-out`;
        heroLayerB.style.opacity = '0';

        window.setTimeout(() => {
          schedulePulse();
        }, fadeOutMs);
      }, fadeInMs);
    }, waitMs);
  }

  // Empezamos con las dos SD inmediatamente. Las HD se descargan en segundo plano.
  Promise.all([
    preloadImage(sets.hd.dim),
    preloadImage(sets.hd.bright)
  ]).then(() => {
    hdReady = true;
  }).catch((error) => {
    console.warn('No se pudieron cargar las imágenes HD de Ultron:', error);
  });

  schedulePulse();
}


function scrollToPreregistro({ smooth = false } = {}) {
  const target = document.getElementById('registro');
  if (!target) return;

  target.scrollIntoView({
    behavior: smooth ? 'smooth' : 'auto',
    block: 'start'
  });
}

document.querySelectorAll('a[href="#registro"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();

    if (window.location.hash !== '#registro') {
      history.pushState(null, '', '#registro');
    }

    scrollToPreregistro({ smooth: true });
  });
});

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#registro') {
    scrollToPreregistro({ smooth: true });
  }
});

window.addEventListener('load', () => {
  if (window.location.hash === '#registro') {
    // Reposiciona después de que estilos, fuentes e imágenes hayan definido el layout final.
    requestAnimationFrame(() => {
      window.setTimeout(() => scrollToPreregistro({ smooth: false }), 80);
    });
  }
});


const missionVideoFrame = document.getElementById('missionVideoFrame');
const missionVideoPlay = document.getElementById('missionVideoPlay');

if (missionVideoFrame && missionVideoPlay) {
  missionVideoPlay.addEventListener('click', () => {
    if (missionVideoFrame.classList.contains('is-playing')) return;

    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/uPzdcvvG328?autoplay=1&playsinline=1&rel=0&modestbranding=1';
    iframe.title = 'Video de CODEXIA — Conoce la misión';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.setAttribute('playsinline', '');

    missionVideoFrame.classList.add('is-playing');
    missionVideoFrame.replaceChildren(iframe);
  });
}
