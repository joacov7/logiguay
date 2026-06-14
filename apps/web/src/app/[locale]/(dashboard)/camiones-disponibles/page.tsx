'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, MapPin, Navigation, X, Send, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import api from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface TruckListing {
  id: string;
  vehicleType: string;
  capacityTons?: number;
  capacityM3?: number;
  originAddress: string;
  originLat?: number;
  originLng?: number;
  availableFrom: string;
  availableTo: string;
  notes?: string;
  isActive: boolean;
  distKm?: number;
  company: { id: string; name: string };
}

const VEHICLE_TYPES = ['CAMION', 'ACOPLADO', 'SEMIRREMOLQUE'];
const RADIUS_OPTIONS = [100, 200, 300, 500];

export default function CamionesDisponiblesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDador = user?.role === 'DADOR' || user?.role === 'ADMIN';
  const isTransportista = user?.role === 'TRANSPORTISTA';

  // Search state (DADOR)
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [radiusKm, setRadiusKm] = useState(200);
  const [typeFilter, setTypeFilter] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [locLabel, setLocLabel] = useState('');

  // Solicitar modal state
  const [solicitar, setSolicitar] = useState<TruckListing | null>(null);
  const [solicitudForm, setSolicitudForm] = useState({
    mensaje: '',
    origen: '',
    destino: '',
    toneladas: '',
    tarifaOfrecida: '',
  });
  const [solicitudOk, setSolicitudOk] = useState(false);

  // Publish form (TRANSPORTISTA)
  const [showPublish, setShowPublish] = useState(false);
  const [form, setForm] = useState({
    vehicleType: 'CAMION',
    capacityTons: '',
    capacityM3: '',
    originAddress: '',
    originLat: '',
    originLng: '',
    availableFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    availableTo: format(new Date(Date.now() + 7 * 24 * 3600_000), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
  });

  function useMyLocation() {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLatInput(pos.coords.latitude.toFixed(5));
        setLngInput(pos.coords.longitude.toFixed(5));
        setLocLabel('Mi ubicación');
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
    );
  }

  function useMyLocationForPublish() {
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({
        ...f,
        originLat: pos.coords.latitude.toFixed(5),
        originLng: pos.coords.longitude.toFixed(5),
      }));
    });
  }

  const { data: searchResults, isLoading: searchLoading } = useQuery<TruckListing[]>({
    queryKey: ['camiones-search', lat, lng, radiusKm, typeFilter],
    queryFn: async () => {
      const params: any = { radiusKm };
      if (lat != null) params.lat = lat;
      if (lng != null) params.lng = lng;
      if (typeFilter) params.vehicleType = typeFilter;
      const res = await api.get('/camiones/search', { params });
      return res.data;
    },
    enabled: isDador,
  });

  const { data: myListings } = useQuery<TruckListing[]>({
    queryKey: ['camiones-my'],
    queryFn: async () => {
      const res = await api.get('/camiones/my-listings');
      return res.data;
    },
    enabled: isTransportista,
  });

  const publishMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post('/camiones', {
        ...data,
        capacityTons: data.capacityTons ? parseFloat(data.capacityTons) : undefined,
        capacityM3: data.capacityM3 ? parseFloat(data.capacityM3) : undefined,
        originLat: data.originLat ? parseFloat(data.originLat) : undefined,
        originLng: data.originLng ? parseFloat(data.originLng) : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camiones-my'] });
      setShowPublish(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/camiones/${id}/deactivate`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['camiones-my'] }),
  });

  const solicitarMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: typeof solicitudForm }) => {
      const res = await api.post(`/camiones/${id}/solicitar`, {
        mensaje: body.mensaje,
        origen: body.origen || undefined,
        destino: body.destino || undefined,
        toneladas: body.toneladas ? parseFloat(body.toneladas) : undefined,
        tarifaOfrecida: body.tarifaOfrecida ? parseFloat(body.tarifaOfrecida) : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      setSolicitudOk(true);
    },
  });

  function openSolicitar(truck: TruckListing) {
    setSolicitar(truck);
    setSolicitudOk(false);
    setSolicitudForm({ mensaje: '', origen: '', destino: '', toneladas: '', tarifaOfrecida: '' });
  }

  function closeSolicitar() {
    setSolicitar(null);
    setSolicitudOk(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Camiones Disponibles</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTransportista ? 'Publicá tu disponibilidad para recibir cargas' : 'Encontrá camiones disponibles cerca de tu carga'}
          </p>
        </div>
        {isTransportista && (
          <Button onClick={() => setShowPublish(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Publicar disponibilidad
          </Button>
        )}
      </div>

      {/* ── Solicitar modal ── */}
      {solicitar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Solicitar camión</h2>
                <p className="text-sm text-gray-500 mt-0.5">{solicitar.vehicleType} · {solicitar.company.name}</p>
              </div>
              <button onClick={closeSolicitar} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {solicitudOk ? (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="h-12 w-12 text-blue-600" />
                <p className="text-lg font-semibold text-gray-900">¡Solicitud enviada!</p>
                <p className="text-sm text-gray-500">El transportista recibirá una notificación con tu propuesta y podrá contactarte.</p>
                <Button className="mt-2" onClick={closeSolicitar}>Cerrar</Button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describí brevemente la carga que necesitás transportar..."
                    value={solicitudForm.mensaje}
                    onChange={(e) => setSolicitudForm((f) => ({ ...f, mensaje: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ciudad origen"
                      value={solicitudForm.origen}
                      onChange={(e) => setSolicitudForm((f) => ({ ...f, origen: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ciudad destino"
                      value={solicitudForm.destino}
                      onChange={(e) => setSolicitudForm((f) => ({ ...f, destino: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Toneladas</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 28"
                      value={solicitudForm.toneladas}
                      onChange={(e) => setSolicitudForm((f) => ({ ...f, toneladas: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa ofrecida ($)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: 150000"
                      value={solicitudForm.tarifaOfrecida}
                      onChange={(e) => setSolicitudForm((f) => ({ ...f, tarifaOfrecida: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeSolicitar}>Cancelar</Button>
                  <Button
                    loading={solicitarMutation.isPending}
                    disabled={!solicitudForm.mensaje.trim()}
                    onClick={() => solicitarMutation.mutate({ id: solicitar.id, body: solicitudForm })}
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Enviar solicitud
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Publish modal ── */}
      {showPublish && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Publicar disponibilidad</h2>
              <button onClick={() => setShowPublish(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de vehículo</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}>
                    {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (ton)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.capacityTons} onChange={(e) => setForm((f) => ({ ...f, capacityTons: e.target.value }))} placeholder="Ej: 28" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad (m³)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.capacityM3} onChange={(e) => setForm((f) => ({ ...f, capacityM3: e.target.value }))} placeholder="Ej: 90" />
                </div>
                <div className="col-span-2">
                  <AddressAutocomplete
                    label="Ubicación de origen"
                    value={form.originAddress}
                    onChange={(addr) => setForm((f) => ({ ...f, originAddress: addr }))}
                    onCoords={(lat, lng) => setForm((f) => ({ ...f, originLat: lat.toFixed(6), originLng: lng.toFixed(6) }))}
                    placeholder="Ciudad o dirección"
                  />
                  {form.originLat && form.originLng && (
                    <p className="text-xs text-gray-400 mt-1">
                      Coords: {form.originLat}, {form.originLng}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disponible desde</label>
                  <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.availableFrom} onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disponible hasta</label>
                  <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.availableTo} onChange={(e) => setForm((f) => ({ ...f, availableTo: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Destinos preferidos, condiciones, etc." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPublish(false)}>Cancelar</Button>
                <Button loading={publishMutation.isPending} onClick={() => publishMutation.mutate(form)}>Publicar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DADOR: Search */}
      {isDador && (
        <>
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" onClick={useMyLocation} loading={geoLoading}>
                  <Navigation className="h-4 w-4 mr-1" />
                  Usar mi ubicación
                </Button>
                <input type="text" placeholder="Latitud" value={latInput} onChange={(e) => setLatInput(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28" />
                <input type="text" placeholder="Longitud" value={lngInput} onChange={(e) => setLngInput(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28" />
                <Button size="sm" variant="outline" onClick={() => {
                  const la = parseFloat(latInput), lo = parseFloat(lngInput);
                  if (!isNaN(la) && !isNaN(lo)) { setLat(la); setLng(lo); setLocLabel('Manual'); }
                }}>Buscar</Button>
                {locLabel && <span className="text-sm text-blue-600 flex items-center gap-1"><MapPin className="h-3 w-3" />{locLabel}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Radio:</span>
                {RADIUS_OPTIONS.map((r) => (
                  <button key={r} onClick={() => setRadiusKm(r)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${radiusKm === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{r} km</button>
                ))}
                <span className="text-sm text-gray-600 ml-4">Tipo:</span>
                <button onClick={() => setTypeFilter('')} className={`px-3 py-1 rounded-full text-xs font-medium ${!typeFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
                {VEHICLE_TYPES.map((t) => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1 rounded-full text-xs font-medium ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
                ))}
              </div>
            </div>
          </Card>

          {searchLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : !searchResults?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Truck className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No hay camiones disponibles en esa zona</p>
              <p className="text-sm mt-1">Probá con un radio mayor o sin filtro de tipo</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{t.vehicleType}</span>
                        {t.distKm != null && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{t.distKm.toFixed(0)} km</span>
                        )}
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">Disponible</span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">{t.company?.name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{t.originAddress}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        {t.capacityTons && <span>{t.capacityTons} t</span>}
                        {t.capacityM3 && <span>{t.capacityM3} m³</span>}
                        <span>Disponible: {format(new Date(t.availableFrom), 'dd MMM', { locale: es })} → {format(new Date(t.availableTo), 'dd MMM yyyy', { locale: es })}</span>
                      </div>
                      {t.notes && <p className="text-xs text-gray-400 mt-1 italic">{t.notes}</p>}
                    </div>
                    <Button size="sm" onClick={() => openSolicitar(t)}>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Solicitar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* TRANSPORTISTA: My listings */}
      {isTransportista && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Mis publicaciones</h2>
          {!myListings?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Truck className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No publicaste disponibilidad aún</p>
              <p className="text-sm mt-1">Publicá tu camión para recibir solicitudes de carga</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myListings.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{t.vehicleType}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${t.isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{t.originAddress}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(t.availableFrom), 'dd MMM', { locale: es })} → {format(new Date(t.availableTo), 'dd MMM yyyy', { locale: es })}
                      </p>
                      {t.notes && <p className="text-xs text-gray-400">{t.notes}</p>}
                    </div>
                    {t.isActive && (
                      <Button size="sm" variant="outline" loading={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate(t.id)}>
                        <X className="h-3 w-3 mr-1" />
                        Desactivar
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
