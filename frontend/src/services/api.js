// src/services/api.js
// All endpoints verified against the actual backend controllers and DTOs.

import axios from 'axios';
import { Storage } from '../utils/storage';
import { API_BASE } from '../utils/config';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT to every request ──────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await Storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

// ── Handle 401 globally (token expired) ─────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) await Storage.clear();
    return Promise.reject(err);
  }
);

// ─────────────────────────────────────────────────────────
// AUTH  →  /api/auth
// POST /api/auth/register  body: { name, email, password, role, vehicleType?, vehicleNumber?, licenseNumber? }
// POST /api/auth/login     body: { email, password }
// Response: { token, tokenType, userId, name, email, role, driverId }
// ─────────────────────────────────────────────────────────
export const authAPI = {
  register: (data)            => api.post('/auth/register', data),
  login:    (email, password) => api.post('/auth/login', { email, password }),
};

// ─────────────────────────────────────────────────────────
// PETS  →  /api/pets
// GET    /api/pets             → PetResponse[]
// POST   /api/pets             body: { name, breed, birthday (YYYY-MM-DD), species?, photoUrl? }
// GET    /api/pets/{id}
// PUT    /api/pets/{id}
// DELETE /api/pets/{id}
// ─────────────────────────────────────────────────────────
export const petAPI = {
  getAll:  ()         => api.get('/pets'),
  getById: (id)       => api.get(`/pets/${id}`),
  create:  (data)     => api.post('/pets', data),
  update:  (id, data) => api.put(`/pets/${id}`, data),
  remove:  (id)       => api.delete(`/pets/${id}`),
};

// ─────────────────────────────────────────────────────────
// MEDICAL RECORDS  →  /api/pets/{petId}/medical-records
// body: { visitDate (YYYY-MM-DD), description, vetName, clinicName?, diagnosis?, cost? }
// ─────────────────────────────────────────────────────────
export const recordAPI = {
  getAll:  (petId)       => api.get(`/pets/${petId}/medical-records`),
  create:  (petId, data) => api.post(`/pets/${petId}/medical-records`, data),
  remove:  (petId, id)   => api.delete(`/pets/${petId}/medical-records/${id}`),
};

// ─────────────────────────────────────────────────────────
// MEDICATIONS  →  /api/pets/{petId}/medications
// body: { name, type (VACCINE|MEDICINE), dateAdministered (YYYY-MM-DD),
//         nextDueDate?, dosage?, notes? }
// ─────────────────────────────────────────────────────────
export const medAPI = {
  getAll:  (petId)       => api.get(`/pets/${petId}/medications`),
  create:  (petId, data) => api.post(`/pets/${petId}/medications`, data),
  remove:  (petId, id)   => api.delete(`/pets/${petId}/medications/${id}`),
};

// ─────────────────────────────────────────────────────────
// REMINDERS  →  /api/pets/{petId}/reminders
// body: { title, description?, reminderDateTime (ISO), type (VET_VISIT|MEDICATION|VACCINATION|GROOMING|OTHER) }
// ─────────────────────────────────────────────────────────
export const reminderAPI = {
  getAll:       (petId)      => api.get(`/pets/${petId}/reminders`),
  getPending:   (petId)      => api.get(`/pets/${petId}/reminders/pending`),
  create:       (petId, data)=> api.post(`/pets/${petId}/reminders`, data),
  markComplete: (petId, id)  => api.patch(`/pets/${petId}/reminders/${id}/complete`),
  remove:       (petId, id)  => api.delete(`/pets/${petId}/reminders/${id}`),
};

// ─────────────────────────────────────────────────────────
// RIDES  →  /api/rides
//
// USER endpoints (role=USER):
//   POST   /api/rides                    body: RideRequest
//   GET    /api/rides                    → RideResponse[]
//   GET    /api/rides/{id}
//   DELETE /api/rides/{id}               → cancel
//
// DRIVER endpoints (role=DRIVER):
//   GET    /api/rides/driver/my-rides    → RideResponse[]
//   PATCH  /api/rides/{id}/accept
//   PATCH  /api/rides/{id}/start
//   PATCH  /api/rides/{id}/complete
//   PATCH  /api/rides/driver/availability body: { available: boolean }
// ─────────────────────────────────────────────────────────
export const rideAPI = {
  // user
  request:    (data) => api.post('/rides', data),
  getMyRides: ()     => api.get('/rides'),
  getById:    (id)   => api.get(`/rides/${id}`),
  cancel:     (id)   => api.delete(`/rides/${id}`),
  // driver
  getDriverRides:     ()          => api.get('/rides/driver/my-rides'),
  accept:             (id)        => api.patch(`/rides/${id}/accept`),
  start:              (id)        => api.patch(`/rides/${id}/start`),
  complete:           (id)        => api.patch(`/rides/${id}/complete`),
  setAvailability:    (available) => api.patch('/rides/driver/availability', { available }),
};

export default api;
