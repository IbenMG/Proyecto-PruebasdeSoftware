const API = 'http://localhost:8000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

export const api = {
  getCampaigns: () => fetch(`${API}/campanias/`, { headers: authHeaders() }).then(r => r.json()),
  createCampaign: (data) => fetch(`${API}/campanias/create/`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
  }).then(r => r.json()),
  getCampaign: (id) => fetch(`${API}/campanias/${id}/`, { headers: authHeaders() }).then(r => r.json()),
};