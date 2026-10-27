const API = 'http://localhost:8000/api';

async function request(path, options = {}, publicRead = false) {
  const token = localStorage.getItem('access_token');
  const headers = { ...options.headers };
  const isFormData = options.body instanceof FormData;
  const body = options.body && !isFormData && typeof options.body !== 'string'
    ? JSON.stringify(options.body)
    : options.body;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  let response = await fetch(`${API}${path}`, { ...options, headers, body });
  if (publicRead && response.status === 401 && token) {
    delete headers.Authorization;
    response = await fetch(`${API}${path}`, { ...options, headers, body });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || 'No se pudo completar la solicitud.');
    error.details = data;
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  getCampaigns: () => request('/campanias/', {}, true),
  getMyCampaigns: () => request('/campanias/mis/'),
  getCampaign: (id) => request(`/campanias/${id}/`, {}, true),
  createCampaign: (data) => request('/campanias/create/', { method: 'POST', body: data }),
  deleteCampaign: (id) => request(`/campanias/${id}/delete/`, { method: 'DELETE' }),
  updateCampaign: (id, data) => request(`/campanias/${id}/`, { method: 'PATCH', body: data }),
  getCampaignUpdates: (id) => request(`/campanias/${id}/actualizaciones/`, {}, true),
  createCampaignUpdate: (id, data) => request(`/campanias/${id}/actualizaciones/`, {
    method: 'POST',
    body: data,
  }),
};
