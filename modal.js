document.addEventListener('DOMContentLoaded', () => {
  // Create popup HTML
  const popupHTML = `
    <div class="popup-overlay" id="contactPopup">
      <div class="popup">
        <button class="popup__close" aria-label="Закрыть" id="closeContactPopup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="popup__inner">
          <h2 class="popup__title">Отправьте сообщение</h2>
          <p class="popup__desc">Заполните форму ниже, и наша команда свяжется с вами в течение одного рабочего дня.</p>
          <form class="contact-form" id="popupContactForm" novalidate>
            <div class="contact-form__row">
              <div class="contact-form__field">
                <label class="contact-form__label" for="popupContactName">Имя *</label>
                <input class="contact-form__input" id="popupContactName" type="text" placeholder="Ваше имя" required />
              </div>
              <div class="contact-form__field">
                <label class="contact-form__label" for="popupContactEmail">Email *</label>
                <input class="contact-form__input" id="popupContactEmail" type="email" placeholder="email@example.com" required />
              </div>
            </div>
            <div class="contact-form__row">
              <div class="contact-form__field">
                <label class="contact-form__label" for="popupContactCompany">Компания</label>
                <input class="contact-form__input" id="popupContactCompany" type="text" placeholder="Название компании" />
              </div>
              <div class="contact-form__field">
                <label class="contact-form__label" for="popupContactPhone">Телефон</label>
                <input class="contact-form__input" id="popupContactPhone" type="tel" placeholder="+998 (___) ___-__-__" />
              </div>
            </div>
            <div class="contact-form__field">
              <label class="contact-form__label" for="popupContactTopic">Тема обращения *</label>
              <select class="contact-form__select" id="popupContactTopic" required>
                <option value="" disabled selected>Выберите тему</option>
                <option value="general">Общий вопрос</option>
                <option value="investor">Для инвесторов</option>
                <option value="partnership">Партнёрство</option>
                <option value="career">Карьера</option>
                <option value="press">Пресса</option>
                <option value="other">Другое</option>
              </select>
            </div>
            <div class="contact-form__field">
              <label class="contact-form__label" for="popupContactMessage">Сообщение *</label>
              <textarea class="contact-form__textarea" id="popupContactMessage" rows="5" placeholder="Опишите ваш вопрос или предложение..." required></textarea>
            </div>
            <button class="btn btn--blue contact-form__submit" type="submit">
              Отправить сообщение
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Append to body
  document.body.insertAdjacentHTML('beforeend', popupHTML);

  const popupOverlay = document.getElementById('contactPopup');
  const closeBtn = document.getElementById('closeContactPopup');
  const form = document.getElementById('popupContactForm');

  const openPopup = (e) => {
    e.preventDefault();
    popupOverlay.classList.add('is-open');
    document.body.classList.add('popup-open');
  };

  const closePopup = () => {
    popupOverlay.classList.remove('is-open');
    document.body.classList.remove('popup-open');
  };

  // Find all contact links
  const contactLinks = document.querySelectorAll('a[href="#contact-form"], a[href="contacts.html#contact-form"]');
  contactLinks.forEach(link => {
    // only if it has 'btn' class so we don't hook up random anchor links on contact page
    if (link.classList.contains('btn') || link.textContent.trim().toLowerCase() === 'связаться') {
      link.addEventListener('click', openPopup);
    }
  });

  closeBtn.addEventListener('click', closePopup);

  popupOverlay.addEventListener('click', (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Handle Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popupOverlay.classList.contains('is-open')) {
      closePopup();
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('popupContactName').value.trim();
    const email = document.getElementById('popupContactEmail').value.trim();
    const topic = document.getElementById('popupContactTopic').value;
    const message = document.getElementById('popupContactMessage').value.trim();
    
    if (!name || !email || !topic || !message) return;
    
    form.reset();
    alert('Спасибо! Ваше сообщение отправлено. Мы свяжемся с вами в течение рабочего дня.');
    closePopup();
  });
});
