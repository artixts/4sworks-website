const loginPanel = document.getElementById('login-panel');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const dashboardError = document.getElementById('dashboard-error');
const list = document.getElementById('enquiries');
const filter = document.getElementById('filter');
let token = '';

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) signOut();
    throw new Error(body.error || 'Request failed.');
  }
  return body;
}
function showDashboard(email) {
  loginPanel.classList.add('hidden');
  dashboard.classList.remove('hidden');
  document.getElementById('signed-in').textContent = `Signed in as ${email}`;
  loadEnquiries();
}
function signOut() {
  token = '';
  loginPanel.classList.remove('hidden');
  dashboard.classList.add('hidden');
  if (loginForm) loginForm.reset();
}
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  const button = loginForm.querySelector('button');
  button.disabled = true;
  try {
    const result = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    })});
    token = result.token; // kept in memory only; sign-in again after refreshing for safer token handling
    showDashboard(result.admin.email);
  } catch (error) {
    loginError.textContent = error.message;
  } finally { button.disabled = false; }
});
async function loadEnquiries() {
  dashboardError.textContent = '';
  list.replaceChildren();
  try {
    const result = await api('/api/admin/enquiries' + (filter.value ? `?status=${encodeURIComponent(filter.value)}` : ''));
    document.getElementById('count').textContent = `${result.enquiries.length} shown (up to 500)`;
    if (!result.enquiries.length) {
      const empty = document.createElement('p'); empty.className = 'admin-muted'; empty.textContent = 'No enquiries found.'; list.append(empty); return;
    }
    for (const item of result.enquiries) {
      const card = document.createElement('article'); card.className = 'enquiry';
      const content = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = item.name;
      const meta = document.createElement('p'); meta.textContent = `${item.service} · ${new Date(item.created_at).toLocaleString()}`;
      const phone = document.createElement('p'); phone.textContent = `Phone: ${item.phone}`;
      const message = document.createElement('p'); message.textContent = item.message || 'No extra details provided.';
      const status = document.createElement('span'); status.className = 'status'; status.textContent = item.status;
      content.append(title, meta, phone, message, status);
      const controls = document.createElement('div');
      const select = document.createElement('select'); select.setAttribute('aria-label', `Status for enquiry ${item.id}`);
      for (const value of ['new', 'contacted', 'closed']) {
        const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = item.status === value; select.append(option);
      }
      select.addEventListener('change', async () => {
        select.disabled = true;
        try { await api(`/api/admin/enquiries/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); await loadEnquiries(); }
        catch (error) { dashboardError.textContent = error.message; select.disabled = false; }
      });
      controls.append(select); card.append(content, controls); list.append(card);
    }
  } catch (error) { dashboardError.textContent = error.message; }
}
document.getElementById('logout').addEventListener('click', signOut);
document.getElementById('refresh').addEventListener('click', loadEnquiries);
filter.addEventListener('change', loadEnquiries);
