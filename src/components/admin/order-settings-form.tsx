'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface OrderSettingsFormProps {
  restaurantId: string;
  restaurantName: string;
}

type DeliveryCoverageMode = 'circle' | 'polygon' | 'zip_code';

interface DeliveryZoneForm {
  id: string;
  name: string;
  deliveryFee: string;
  minimumOrderAmount: string;
  coverageMode: DeliveryCoverageMode;
  radiusKm: string;
  polygonPoints: string;
  zipCodes: string;
}

interface DeliveryZoneApi {
  id?: string | null;
  name?: string | null;
  map_selection?: 'circle' | 'polygon' | 'zip_code' | string | null;
  delivery_fee?: number | string | null;
  zip_code?: string | null;
  polygon_points?: unknown;
  circle_radius?: number | string | null;
  min_order_amount?: number | string | null;
}

interface OrderSettingsSaveResponse {
  success?: boolean;
  error?: string;
  data?: {
    allow_tips?: boolean;
    pickup_allowed?: boolean;
    delivery_allowed?: boolean;
    preparation_time?: number | null;
    transaction_tax_rate?: number | null;
    delivery_zones?: DeliveryZoneApi[];
  };
}

let googleMapsScriptLoader: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsScriptLoader) {
    return googleMapsScriptLoader;
  }

  googleMapsScriptLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-order-settings="true"]',
    );

    if (existingScript) {
      if (window.google?.maps) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsOrderSettings = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });

  return googleMapsScriptLoader;
}

function parsePolygonPoints(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [latText, lngText] = line.split(',').map((part) => part.trim());
      const lat = Number.parseFloat(latText);
      const lng = Number.parseFloat(lngText);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      return { lat, lng };
    })
    .filter((point): point is { lat: number; lng: number } => Boolean(point));
}

function toNumberString(value: unknown, fallback = '0') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    if (trimmed && Number.isFinite(parsed)) {
      return String(parsed);
    }
  }
  return fallback;
}

function polygonPointsToText(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  const points = value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const row = item as Record<string, unknown>;
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      return `${lat.toFixed(6)},${lng.toFixed(6)}`;
    })
    .filter((point): point is string => Boolean(point));

  return points.join('\n');
}

function mapZoneFromApi(zone: DeliveryZoneApi, index: number): DeliveryZoneForm {
  const rawMode = typeof zone.map_selection === 'string' ? zone.map_selection : 'circle';
  const coverageMode: DeliveryCoverageMode =
    rawMode === 'polygon' || rawMode === 'zip_code' ? rawMode : 'circle';

  return {
    id: zone.id?.trim() || `zone-${Date.now()}-${index}`,
    name: zone.name?.trim() || `Delivery zone ${index + 1}`,
    deliveryFee: toNumberString(zone.delivery_fee, '0'),
    minimumOrderAmount: toNumberString(zone.min_order_amount, '0'),
    coverageMode,
    radiusKm: toNumberString(zone.circle_radius, '3.2'),
    polygonPoints: polygonPointsToText(zone.polygon_points),
    zipCodes: zone.zip_code?.trim() || '',
  };
}

function formatPolygonPath(path: any) {
  const points: string[] = [];
  for (let index = 0; index < path.getLength(); index += 1) {
    const point = path.getAt(index);
    points.push(`${point.lat().toFixed(6)},${point.lng().toFixed(6)}`);
  }
  return points.join('\n');
}

export default function OrderSettingsForm({
  restaurantId,
  restaurantName,
}: OrderSettingsFormProps) {
  const [allowTips, setAllowTips] = useState(true);
  const [pickupAllowed, setPickupAllowed] = useState(true);
  const [deliveryAllowed, setDeliveryAllowed] = useState(true);
  const [preparationTime, setPreparationTime] = useState('');
  const [transactionTaxRate, setTransactionTaxRate] = useState('5');
  const [zones, setZones] = useState<DeliveryZoneForm[]>([
    {
      id: 'zone-1',
      name: 'Delivery zone 1',
      deliveryFee: '4',
      minimumOrderAmount: '15',
      coverageMode: 'circle',
      radiusKm: '3.2',
      polygonPoints: '',
      zipCodes: '',
    },
  ]);
  const [selectedZoneId, setSelectedZoneId] = useState('zone-1');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingZone, setSavingZone] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const mapClickListenerRef = useRef<any>(null);
  const polygonPathListenersRef = useRef<any[]>([]);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/order-settings?restaurant_id=${encodeURIComponent(restaurantId)}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              data?: {
                allow_tips?: boolean;
                pickup_allowed?: boolean;
                delivery_allowed?: boolean;
                preparation_time?: number | null;
                transaction_tax_rate?: number | null;
                address?: string;
                delivery_zones?: DeliveryZoneApi[];
              };
              error?: string;
            }
          | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load order settings.');
        }

        if (!active) {
          return;
        }

        setAllowTips(payload.data?.allow_tips ?? true);
        setPickupAllowed(payload.data?.pickup_allowed ?? true);
        setDeliveryAllowed(payload.data?.delivery_allowed ?? true);
        setPreparationTime(payload.data?.preparation_time != null ? String(payload.data.preparation_time) : '');
        setTransactionTaxRate(payload.data?.transaction_tax_rate != null ? String(payload.data.transaction_tax_rate) : '5');
        setRestaurantAddress(payload.data?.address ?? '');
        const apiZones = (payload.data?.delivery_zones || []).map(mapZoneFromApi);
        if (apiZones.length > 0) {
          setZones(apiZones);
          setSelectedZoneId(apiZones[0].id);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load order settings.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, [restaurantId]);

  const buildSavePayload = () => ({
    restaurant_id: restaurantId,
    allow_tips: allowTips,
    pickup_allowed: pickupAllowed,
    delivery_allowed: deliveryAllowed,
    preparation_time: preparationTime.trim() !== '' ? Number(preparationTime) : null,
    transaction_tax_rate: transactionTaxRate.trim() !== '' ? Number(transactionTaxRate) : 5,
    delivery_zones: zones.map((zone) => ({
      name: zone.name.trim(),
      map_selection: zone.coverageMode,
      delivery_fee: Number.parseFloat(zone.deliveryFee || '0'),
      min_order_amount: Number.parseFloat(zone.minimumOrderAmount || '0'),
      zip_code: zone.coverageMode === 'zip_code' ? zone.zipCodes.trim() || null : null,
      polygon_points:
        zone.coverageMode === 'polygon'
          ? parsePolygonPoints(zone.polygonPoints).map((point) => ({
              lat: point.lat,
              lng: point.lng,
            }))
          : null,
      circle_radius:
        zone.coverageMode === 'circle'
          ? Number.parseFloat(zone.radiusKm || '0')
          : null,
    })),
  });

  const persistOrderSettings = async (successMessage: string) => {
    const response = await fetch('/api/admin/order-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildSavePayload()),
    });

    const payload = (await response.json().catch(() => null)) as OrderSettingsSaveResponse | null;
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Failed to save order settings.');
    }

    const apiZones = (payload.data?.delivery_zones || []).map(mapZoneFromApi);
    if (apiZones.length > 0) {
      setZones(apiZones);
      const stillExists = apiZones.some((zone) => zone.id === selectedZoneId);
      setSelectedZoneId(stillExists ? selectedZoneId : apiZones[0].id);
    }

    toast.success(successMessage);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await persistOrderSettings('Order settings saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save order settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveZone = async () => {
    try {
      setSavingZone(true);
      await persistOrderSettings('Delivery zone saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save delivery zone.');
    } finally {
      setSavingZone(false);
    }
  };

  const mapQuery = (restaurantAddress.trim() || restaurantName.trim());
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';
  const selectedZone =
    zones.find((zone) => zone.id === selectedZoneId) || zones[0] || null;

  const updateSelectedZone = (updates: Partial<DeliveryZoneForm>) => {
    if (!selectedZone) {
      return;
    }

    setZones((current) =>
      current.map((zone) =>
        zone.id === selectedZone.id ? { ...zone, ...updates } : zone,
      ),
    );
  };

  const handleAddZone = () => {
    const nextZoneNumber = zones.length + 1;
    const nextZone: DeliveryZoneForm = {
      id: `zone-${Date.now()}`,
      name: `Delivery zone ${nextZoneNumber}`,
      deliveryFee: '0',
      minimumOrderAmount: '0',
      coverageMode: 'circle',
      radiusKm: '3.2',
      polygonPoints: '',
      zipCodes: '',
    };

    setZones((current) => [...current, nextZone]);
    setSelectedZoneId(nextZone.id);
  };

  const handleDeleteSelectedZone = () => {
    if (!selectedZone || zones.length <= 1) {
      return;
    }

    const nextZones = zones.filter((zone) => zone.id !== selectedZone.id);
    setZones(nextZones);
    setSelectedZoneId(nextZones[0]?.id || '');
  };

  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      const mapContainer = mapContainerRef.current;
      if (!googleMapsApiKey || !mapQuery || !mapContainer) {
        setMapReady(false);
        return;
      }

      try {
        setMapError(null);
        await loadGoogleMapsScript(googleMapsApiKey);

        if (cancelled || !window.google?.maps) {
          return;
        }

        const maps = window.google.maps;
        const Geocoder = maps.Geocoder;
        const MapConstructor = maps.Map;
        const MarkerConstructor = maps.Marker;
        if (!Geocoder || !MapConstructor || !MarkerConstructor) {
          setMapError('Google Maps constructors are unavailable.');
          setMapReady(false);
          return;
        }
        const geocoder = new Geocoder();

        geocoder.geocode({ address: mapQuery }, (results: any[], status: string) => {
          if (cancelled) {
            return;
          }

          const location = results?.[0]?.geometry?.location;
          const center =
            status === 'OK' && location
              ? { lat: location.lat(), lng: location.lng() }
              : { lat: 40.7128, lng: -74.0060 };

          if (!mapRef.current) {
            mapRef.current = new MapConstructor(mapContainer, {
              center,
              zoom: 13,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
            });
          } else {
            mapRef.current.setCenter(center);
          }

          if (!markerRef.current) {
            markerRef.current = new MarkerConstructor({
              map: mapRef.current,
              position: center,
              title: restaurantName,
            });
          } else {
            markerRef.current.setPosition(center);
            markerRef.current.setMap(mapRef.current);
          }

          if (status !== 'OK' || !location) {
            setMapError('Unable to pinpoint exact address. Showing default map area.');
          } else {
            setMapError(null);
          }
          setMapReady(true);
        });
      } catch (error) {
        setMapError(error instanceof Error ? error.message : 'Failed to load map.');
        setMapReady(false);
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey, mapQuery, restaurantName]);

  useEffect(() => {
    if (!mapReady || !selectedZone || !window.google?.maps || !mapRef.current) {
      return;
    }

    const maps = window.google.maps;
    const map = mapRef.current;
    const removeListener = maps.event?.removeListener;

    if (mapClickListenerRef.current && removeListener) {
      removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }

    if (removeListener) {
      polygonPathListenersRef.current.forEach((listener) => removeListener(listener));
    }
    polygonPathListenersRef.current = [];

    if (selectedZone.coverageMode === 'zip_code') {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }
      return;
    }

    if (selectedZone.coverageMode === 'circle') {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }

      const center = markerRef.current?.getPosition() || map.getCenter();
      const radius = Number.parseFloat(selectedZone.radiusKm || '0');
      const radiusMeters = Number.isFinite(radius) ? Math.max(radius, 0) * 1000 : 0;
      const CircleConstructor = maps.Circle;
      if (!CircleConstructor) {
        return;
      }

      if (!circleRef.current) {
        circleRef.current = new CircleConstructor({
          map,
          center,
          radius: radiusMeters,
          fillColor: '#a78bfa',
          fillOpacity: 0.2,
          strokeColor: '#7c3aed',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          editable: true,
          draggable: true,
        });
      } else {
        circleRef.current.setMap(map);
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(radiusMeters);
      }

      mapClickListenerRef.current = map.addListener('click', (event: any) => {
        if (event?.latLng && circleRef.current) {
          circleRef.current.setCenter(event.latLng);
        }
      });

      return;
    }

    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    const parsedPoints = parsePolygonPoints(selectedZone.polygonPoints || '');
    const center = markerRef.current?.getPosition() || map.getCenter();

    const defaultPath = [
      { lat: center.lat() + 0.01, lng: center.lng() - 0.01 },
      { lat: center.lat() + 0.01, lng: center.lng() + 0.01 },
      { lat: center.lat() - 0.01, lng: center.lng() + 0.01 },
      { lat: center.lat() - 0.01, lng: center.lng() - 0.01 },
    ];
    const PolygonConstructor = maps.Polygon;
    if (!PolygonConstructor) {
      return;
    }

    if (!polygonRef.current) {
      polygonRef.current = new PolygonConstructor({
        map,
        paths: parsedPoints.length ? parsedPoints : defaultPath,
        fillColor: '#a78bfa',
        fillOpacity: 0.2,
        strokeColor: '#7c3aed',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        editable: true,
      });
    } else {
      polygonRef.current.setMap(map);
      polygonRef.current.setPath(parsedPoints.length ? parsedPoints : defaultPath);
    }

    const path = polygonRef.current.getPath();

    const syncPolygonValue = () => {
      const serialized = formatPolygonPath(path);
      if (serialized !== selectedZone.polygonPoints) {
        updateSelectedZone({ polygonPoints: serialized });
      }
    };

    if (!selectedZone.polygonPoints && path.getLength() > 0) {
      syncPolygonValue();
    }

    polygonPathListenersRef.current.push(path.addListener('set_at', syncPolygonValue));
    polygonPathListenersRef.current.push(path.addListener('insert_at', syncPolygonValue));
    polygonPathListenersRef.current.push(path.addListener('remove_at', syncPolygonValue));

    mapClickListenerRef.current = map.addListener('click', (event: any) => {
      if (event?.latLng) {
        path.push(event.latLng);
        syncPolygonValue();
      }
    });
  }, [mapReady, selectedZone?.id, selectedZone?.coverageMode, selectedZone?.radiusKm, selectedZone?.polygonPoints]);

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading order settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Ordering Preferences</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage tip and fulfillment availability for {restaurantName}.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Allow tips</p>
            <p className="mt-1 text-xs text-gray-600">
              When enabled, tip options will appear on the checkout page.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={allowTips}
            onClick={() => setAllowTips((current) => !current)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              allowTips ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                allowTips ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Pickup allowed</p>
            <p className="mt-1 text-xs text-gray-600">
              When disabled, pickup is hidden on menu, cart, and checkout.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pickupAllowed}
            onClick={() => setPickupAllowed((current) => !current)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              pickupAllowed ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                pickupAllowed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Delivery allowed</p>
            <p className="mt-1 text-xs text-gray-600">
              When disabled, delivery is hidden on menu, cart, and checkout.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={deliveryAllowed}
            onClick={() => setDeliveryAllowed((current) => !current)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              deliveryAllowed ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                deliveryAllowed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="preparation-time" className="text-sm font-semibold text-gray-900">
                Preparation time (minutes)
              </label>
              <p className="mt-1 text-xs text-gray-600">
                Average time to prepare an order. Shown to customers at checkout.
              </p>
            </div>
            <input
              id="preparation-time"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 30"
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="transaction-tax-rate" className="text-sm font-semibold text-gray-900">
                Transaction tax rate (%)
              </label>
              <p className="mt-1 text-xs text-gray-600">
                Tax percentage applied to the subtotal at checkout. Set to 0 to disable tax.
              </p>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white">
              <input
                id="transaction-tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="5"
                value={transactionTaxRate}
                onChange={(e) => setTransactionTaxRate(e.target.value)}
                className="w-20 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <span className="inline-flex items-center border-l border-gray-300 bg-gray-50 px-3 text-sm text-gray-700">%</span>
            </div>
          </div>
        </div>

        {/* <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Delivery Zones</h3>
            <p className="mt-1 text-xs text-gray-600">
              Configure delivery coverage and pricing.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              {googleMapsApiKey && mapQuery ? (
                <div ref={mapContainerRef} className="h-full min-h-[360px] w-full" />
              ) : (
                <div className="flex h-full min-h-[360px] items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-600">
                  {mapQuery
                    ? 'Google Maps API key missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.'
                    : 'Restaurant address and name are unavailable. Add details in restaurant profile.'}
                </div>
              )}
              <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-sm">
                {restaurantAddress || 'Address unavailable'}
              </div>
              {selectedZone ? (
                <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-purple-600/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm">
                  {selectedZone.coverageMode === 'zip_code'
                    ? 'ZIP code'
                    : selectedZone.coverageMode}
                </div>
              ) : null}
              {mapError ? (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-rose-600/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                  {mapError}
                </div>
              ) : null}
              <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
                Tip: Press Ctrl and drag a handle to adjust coordinates.
              </div>
            </div>

            <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">Delivery zone settings</p>
                <button
                  type="button"
                  onClick={handleAddZone}
                  className="inline-flex items-center rounded-md border border-purple-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50"
                >
                  Add zone
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {zones.map((zone) => {
                  const isSelected = zone.id === selectedZone?.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                        isSelected
                          ? 'border-purple-300 bg-purple-100 text-purple-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:text-purple-700'
                      }`}
                    >
                      {zone.name}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">Name</span>
                  <input
                    type="text"
                    value={selectedZone?.name || ''}
                    onChange={(event) => updateSelectedZone({ name: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">Delivery fee</span>
                  <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white">
                    <span className="inline-flex items-center border-r border-gray-300 px-3 text-sm text-gray-700">USD</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={selectedZone?.deliveryFee || '0'}
                      onChange={(event) => updateSelectedZone({ deliveryFee: event.target.value })}
                      className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    />
                  </div>
                </label>

                <div>
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Select on map
                  </span>
                  <div className="grid grid-cols-3 rounded-lg border border-gray-300 bg-white p-1">
                    {([
                      { key: 'circle', label: 'Circle' },
                      { key: 'polygon', label: 'Polygon' },
                      { key: 'zip_code', label: 'Zip code' },
                    ] as const).map((modeOption) => {
                      const active = selectedZone?.coverageMode === modeOption.key;
                      return (
                        <button
                          key={modeOption.key}
                          type="button"
                          onClick={() =>
                            updateSelectedZone({ coverageMode: modeOption.key })
                          }
                          className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                            active
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                        >
                          {modeOption.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedZone?.coverageMode === 'circle' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-700">
                      Circle radius (km)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={selectedZone.radiusKm || '0'}
                      onChange={(event) =>
                        updateSelectedZone({ radiusKm: event.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                ) : null}

                {selectedZone?.coverageMode === 'polygon' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-700">
                      Polygon points (lat,lng per line)
                    </span>
                    <textarea
                      value={selectedZone.polygonPoints || ''}
                      onChange={(event) =>
                        updateSelectedZone({ polygonPoints: event.target.value })
                      }
                      rows={4}
                      placeholder="42.3501,-73.4001&#10;42.3511,-73.3901&#10;42.3410,-73.3880"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                ) : null}

                {selectedZone?.coverageMode === 'zip_code' ? (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-700">
                      ZIP codes (comma separated)
                    </span>
                    <input
                      type="text"
                      value={selectedZone.zipCodes || ''}
                      onChange={(event) =>
                        updateSelectedZone({ zipCodes: event.target.value })
                      }
                      placeholder="01230, 01247, 01257"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">Minimum order amount</span>
                  <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white">
                    <span className="inline-flex items-center border-r border-gray-300 px-3 text-sm text-gray-700">USD</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={selectedZone?.minimumOrderAmount || '0'}
                      onChange={(event) =>
                        updateSelectedZone({ minimumOrderAmount: event.target.value })
                      }
                      className="w-full px-3 py-2 text-sm text-gray-900 outline-none"
                    />
                  </div>
                </label>

                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteSelectedZone}
                    disabled={zones.length <= 1}
                    className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete zone
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveZone}
                    disabled={savingZone}
                    className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
                  >
                    {savingZone ? 'Saving...' : 'Save zone'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
