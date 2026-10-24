const BUSINESS_PHONE = "9497464976"; // 4Sworks contact number.
const BUSINESS_WHATSAPP = "919497464976"; // 4Sworks WhatsApp: India country code + number, digits only.

const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  toggle.textContent = open ? '×' : '☰';
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggle) { toggle.textContent = '☰'; toggle.setAttribute('aria-label', 'Open navigation'); }
}));
document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('enquiry-form');
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.getElementById('form-status');
  const submit = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  const payload = {
    name: String(data.get('name') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    service: String(data.get('service') || '').trim(),
    message: String(data.get('message') || '').trim()
  };
  status.textContent = '';
  submit.disabled = true;
  submit.textContent = 'Sending…';

  // Open a blank tab immediately during the click so browsers do not block it
  // after the asynchronous API request finishes.
  const whatsappTab = window.open('about:blank', '_blank');
  if (whatsappTab) {
    whatsappTab.document.title = 'Opening WhatsApp…';
    whatsappTab.document.body.textContent = 'Your enquiry is being prepared. Please wait…';
  }

  try {
    const response = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not submit your enquiry.');
    const whatsappMessage = [
      'New enquiry for 4Sworks',
      '',
      `Name: ${payload.name}`,
      `Customer phone: ${payload.phone}`,
      `Service: ${payload.service}`,
      `Work details: ${payload.message || 'Not provided'}`
    ].join('\\n');
    const whatsappUrl = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;

    form.reset();
    status.textContent = 'Enquiry saved. WhatsApp is opening — press Send there to message 4Sworks.';
    if (whatsappTab && !whatsappTab.closed) {
      whatsappTab.location.href = whatsappUrl;
    } else {
      // Fallback if the browser blocked the new tab.
      window.location.href = whatsappUrl;
    }
  } catch (error) {
    if (whatsappTab && !whatsappTab.closed) whatsappTab.close();
    status.textContent = error.message || 'Unable to save your enquiry. Please try again.';
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Send enquiry <span>↗</span>';
  }
});
