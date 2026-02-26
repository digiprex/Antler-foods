'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import FileUpload from '@/components/ui/file-upload';
import {
  getServiceModels,
  getRestaurantDraftById,
  type RestaurantDraftItem,
  updateRestaurant,
} from '@/lib/graphql/queries';
import { nhost } from '@/lib/nhost';

type RestaurantScope = {
  id: string;
  name: string;
};

type SaveNotice = {
  tone: 'success' | 'error';
  message: string;
};

type GalleryItem = {
  id: string;
  restaurant_id: string;
  source: string;
  file_id: string | null;
  external_id: string | null;
  type: string;
  created_at: string | null;
  url: string;
};

interface GalleryApiResponse {
  success: boolean;
  data?: GalleryItem[];
  error?: string;
}

interface DeleteMediaApiResponse {
  success: boolean;
  action?: string;
  error?: string;
}

type GooglePhotoItem = {
  photo_id: string;
  width: number | null;
  height: number | null;
  preview_url: string;
};

interface GooglePhotosApiResponse {
  success: boolean;
  data?: GooglePhotoItem[];
  error?: string;
}

function useRestaurantScope(): RestaurantScope | null {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantName = searchParams.get('restaurant_name')?.trim() ?? '';

  if (!restaurantId || !restaurantName) {
    return null;
  }

  return {
    id: restaurantId,
    name: restaurantName,
  };
}

function useRestaurantDraft(restaurantId: string | null) {
  const [draft, setDraft] = useState<RestaurantDraftItem | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(restaurantId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!restaurantId) {
      setDraft(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const nextDraft = await getRestaurantDraftById(restaurantId);
      if (!nextDraft) {
        setDraft(null);
        setLoadError('Restaurant details were not found for this selection.');
        return;
      }

      setDraft(nextDraft);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load restaurant details.';
      setDraft(null);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    draft,
    isLoading,
    loadError,
    reload,
  };
}

function SelectionRequiredCard({ target }: { target: string }) {
  return (
    <section className="space-y-5">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{target}</h1>
      <div className="rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <h2 className="text-3xl font-semibold text-[#111827]">Select a restaurant</h2>
        <p className="mt-3 text-lg text-[#5f6c78]">
          Select a restaurant from the search box to manage {target.toLowerCase()}.
        </p>
      </div>
    </section>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{title}</h1>
      <div className="rounded-3xl border border-[#d7e2e6] bg-white p-8 text-lg text-[#5f6c78]">
        Loading restaurant data...
      </div>
    </section>
  );
}

function ErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-5">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{title}</h1>
      <div className="space-y-4 rounded-3xl border border-[#f0d5d5] bg-white p-8">
        <p className="text-lg text-[#a72b2b]">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center rounded-xl bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f2937]"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function FormMessage({ notice }: { notice: SaveNotice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm ${
        notice.tone === 'success'
          ? 'bg-[#e8f6ed] text-[#25613d]'
          : 'bg-[#fde8e8] text-[#9b1c1c]'
      }`}
    >
      {notice.message}
    </p>
  );
}

function Header({
  title,
  subtitle,
  restaurantName,
}: {
  title: string;
  subtitle: string;
  restaurantName: string;
}) {
  return (
    <div className="space-y-1">
      <h1 className="text-5xl font-semibold tracking-tight text-[#101827]">{title}</h1>
      <p className="text-lg text-[#5f6c78]">{subtitle}</p>
      <p className="text-sm font-medium text-[#111827]">Restaurant: {restaurantName}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  type?: 'text' | 'email';
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#111827]">
        {required ? '* ' : ''}
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border border-[#d2dde2] px-4 py-3 text-base outline-none transition ${
          readOnly
            ? 'cursor-not-allowed bg-[#f4f7f9] text-[#5f6c78]'
            : 'bg-white text-[#111827] focus:border-[#88c39b] focus:ring-2 focus:ring-[#cde9d7]'
        }`}
      />
    </label>
  );
}

function FormSelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  options: string[];
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#111827]">
        {required ? '* ' : ''}
        {label}
      </span>
      <select
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#d2dde2] bg-white px-4 py-3 text-base text-[#111827] outline-none transition focus:border-[#88c39b] focus:ring-2 focus:ring-[#cde9d7] disabled:cursor-not-allowed disabled:bg-[#f4f7f9] disabled:text-[#5f6c78]"
      >
        <option value="">Select service model</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MyInfoProfilePage() {
  const restaurant = useRestaurantScope();
  const { draft, isLoading, loadError, reload } = useRestaurantDraft(
    restaurant?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [serviceModel, setServiceModel] = useState('');
  const [serviceModelOptions, setServiceModelOptions] = useState<string[]>([]);
  const [isServiceModelsLoading, setIsServiceModelsLoading] = useState(true);
  const [cuisineTypes, setCuisineTypes] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [googleBusinessLink, setGoogleBusinessLink] = useState('');

  useEffect(() => {
    if (!draft) {
      return;
    }

    setName(draft.name);
    setShortName(draft.legalName);
    setPhoneNumber(draft.phoneNumber);
    setEmail(draft.email);
    setBusinessType(draft.businessType);
    setAddress(draft.address);
    setCity(draft.city);
    setState(draft.state);
    setCountry(draft.country);
    setPostalCode(draft.postalCode);
    setServiceModel(draft.serviceModel);
    setCuisineTypes(draft.cuisineTypes.join(', '));
    setGooglePlaceId(draft.googlePlaceId);
    setGoogleBusinessLink(draft.gmbLink);
  }, [draft]);

  useEffect(() => {
    let isActive = true;

    const loadServiceModels = async () => {
      try {
        setIsServiceModelsLoading(true);
        const models = await getServiceModels();
        if (!isActive) {
          return;
        }

        const names = models
          .map((model) => model.name.trim())
          .filter(Boolean);
        setServiceModelOptions(Array.from(new Set(names)));
      } catch {
        if (isActive) {
          setServiceModelOptions([]);
        }
      } finally {
        if (isActive) {
          setIsServiceModelsLoading(false);
        }
      }
    };

    void loadServiceModels();

    return () => {
      isActive = false;
    };
  }, []);

  if (!restaurant) {
    return <SelectionRequiredCard target="Profile" />;
  }

  if (isLoading) {
    return <LoadingCard title="Profile" />;
  }

  if (!draft || loadError) {
    return (
      <ErrorCard
        title="Profile"
        message={loadError || 'Restaurant profile was not found.'}
        onRetry={reload}
      />
    );
  }

  const mergedServiceModelOptions =
    serviceModel && !serviceModelOptions.includes(serviceModel)
      ? [serviceModel, ...serviceModelOptions]
      : serviceModelOptions;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!name.trim()) {
      setNotice({
        tone: 'error',
        message: 'Restaurant name is required.',
      });
      return;
    }

    setIsSaving(true);

    try {
      await updateRestaurant(restaurant.id, {
        name: name.trim(),
        sms_name: shortName.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim(),
        business_type: businessType.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postal_code: postalCode.trim(),
        service_model: serviceModel.trim(),
        cuisine_types: cuisineTypes
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      });

      setNotice({
        tone: 'success',
        message: 'Restaurant details updated.',
      });
      await reload();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update profile.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <Header
        title="Profile"
        subtitle="Update core restaurant profile details."
        restaurantName={restaurant.name}
      />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8"
      >
        <FormMessage notice={notice} />
        <FormField label="Name" value={name} onChange={setName} required />
        <FormField
          label="Short name"
          value={shortName}
          onChange={setShortName}
          required
        />
        <FormField
          label="Phone number"
          value={phoneNumber}
          onChange={setPhoneNumber}
        />
        <FormField label="Email" value={email} onChange={setEmail} type="email" />
        <FormField
          label="Business type"
          value={businessType}
          onChange={setBusinessType}
        />
        <FormField label="Address" value={address} onChange={setAddress} />
        <FormField label="City" value={city} onChange={setCity} />
        <FormField label="State" value={state} onChange={setState} />
        <FormField label="Country" value={country} onChange={setCountry} />
        <FormField
          label="Postal code"
          value={postalCode}
          onChange={setPostalCode}
        />
        <FormSelectField
          label="Service model"
          value={serviceModel}
          onChange={setServiceModel}
          options={mergedServiceModelOptions}
          disabled={isServiceModelsLoading}
        />
        <FormField
          label="Cuisine types (comma separated)"
          value={cuisineTypes}
          onChange={setCuisineTypes}
        />
        <FormField
          label="Google Place ID"
          value={googlePlaceId}
          onChange={setGooglePlaceId}
          readOnly
        />
        <FormField
          label="Google Business Link"
          value={googleBusinessLink}
          onChange={setGoogleBusinessLink}
          readOnly
        />
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-xl bg-[#5dc67d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4db46b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </section>
  );
}

export function MyInfoBusinessInformationPage() {
  const restaurant = useRestaurantScope();
  const { draft, isLoading, loadError, reload } = useRestaurantDraft(
    restaurant?.id ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [businessType, setBusinessType] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (!draft) {
      return;
    }

    setBusinessType(draft.businessType);
    setAddress(draft.address);
    setCity(draft.city);
    setState(draft.state);
    setCountry(draft.country);
    setPostalCode(draft.postalCode);
  }, [draft]);

  if (!restaurant) {
    return <SelectionRequiredCard target="Business Information" />;
  }

  if (isLoading) {
    return <LoadingCard title="Business Information" />;
  }

  if (!draft || loadError) {
    return (
      <ErrorCard
        title="Business Information"
        message={loadError || 'Business details were not found.'}
        onRetry={reload}
      />
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setIsSaving(true);

    try {
      await updateRestaurant(restaurant.id, {
        business_type: businessType.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postal_code: postalCode.trim(),
      });

      setNotice({
        tone: 'success',
        message: 'Business information updated.',
      });
      await reload();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update business information.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <Header
        title="Business Information"
        subtitle="Manage address and business contact details."
        restaurantName={restaurant.name}
      />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8"
      >
        <FormMessage notice={notice} />
        <FormField
          label="Business type"
          value={businessType}
          onChange={setBusinessType}
        />
        <FormField label="Address" value={address} onChange={setAddress} />
        <FormField label="City" value={city} onChange={setCity} />
        <FormField label="State" value={state} onChange={setState} />
        <FormField label="Country" value={country} onChange={setCountry} />
        <FormField label="Postal code" value={postalCode} onChange={setPostalCode} />
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-xl bg-[#5dc67d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4db46b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : 'Save business info'}
        </button>
      </form>
    </section>
  );
}

export function MyInfoGoogleProfilePage() {
  const restaurant = useRestaurantScope();
  const { draft, isLoading, loadError, reload } = useRestaurantDraft(
    restaurant?.id ?? null,
  );
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [googleBusinessLink, setGoogleBusinessLink] = useState('');

  useEffect(() => {
    if (!draft) {
      return;
    }

    setGooglePlaceId(draft.googlePlaceId);
    setGoogleBusinessLink(draft.gmbLink);
  }, [draft]);

  if (!restaurant) {
    return <SelectionRequiredCard target="Google profile" />;
  }

  if (isLoading) {
    return <LoadingCard title="Google profile" />;
  }

  if (!draft || loadError) {
    return (
      <ErrorCard
        title="Google profile"
        message={loadError || 'Google profile details were not found.'}
        onRetry={reload}
      />
    );
  }

  return (
    <section className="space-y-5">
      <Header
        title="Google profile"
        subtitle="Google place details for this restaurant (read-only)."
        restaurantName={restaurant.name}
      />

      <div className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <FormField
          label="Google Place ID"
          value={googlePlaceId}
          onChange={setGooglePlaceId}
          readOnly
        />
        <FormField
          label="Google Business Link"
          value={googleBusinessLink}
          onChange={setGoogleBusinessLink}
          readOnly
        />
      </div>
    </section>
  );
}

export function MyInfoGalleryPage() {
  const restaurant = useRestaurantScope();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [googlePhotos, setGooglePhotos] = useState<GooglePhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(restaurant));
  const [isGoogleLoading, setIsGoogleLoading] = useState(Boolean(restaurant));
  const [importingPhotoId, setImportingPhotoId] = useState<string | null>(null);
  const [notice, setNotice] = useState<SaveNotice | null>(null);

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const accessToken = await nhost.auth.getAccessToken();
      if (!accessToken) {
        throw new Error('Your session has expired. Please login again.');
      }

      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);

      return fetch(input, {
        ...init,
        headers,
      });
    },
    [],
  );

  const loadGallery = useCallback(async () => {
    if (!restaurant?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/admin/restaurant-media?restaurant_id=${encodeURIComponent(
          restaurant.id,
        )}`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as GalleryApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load gallery items.');
      }

      setItems(payload.data || []);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load gallery items.';
      setNotice({
        tone: 'error',
        message,
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, restaurant?.id]);

  const loadGooglePhotos = useCallback(async () => {
    if (!restaurant?.id) {
      setGooglePhotos([]);
      setIsGoogleLoading(false);
      return;
    }

    setIsGoogleLoading(true);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-photos`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as GooglePhotosApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load Google place photos.');
      }

      setGooglePhotos(payload.data || []);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to load Google place photos.';
      setNotice({
        tone: 'error',
        message,
      });
      setGooglePhotos([]);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [fetchWithAuth, restaurant?.id]);

  useEffect(() => {
    void loadGallery();
    void loadGooglePhotos();
  }, [loadGallery, loadGooglePhotos]);

  if (!restaurant) {
    return <SelectionRequiredCard target="Gallery" />;
  }

  const onDeleteItem = async (mediaId: string) => {
    setNotice(null);

    try {
      const response = await fetchWithAuth('/api/admin/restaurant-media', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_id: mediaId,
        }),
      });

      const payload = (await response.json()) as DeleteMediaApiResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to remove gallery image.');
      }

      setNotice({
        tone: 'success',
        message:
          payload.action === 'hidden'
            ? 'Google photo hidden from gallery.'
            : 'Gallery image removed.',
      });
      await loadGallery();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to remove gallery image.';
      setNotice({
        tone: 'error',
        message,
      });
    }
  };

  const onImportGooglePhoto = async (photoId: string) => {
    if (!restaurant?.id) {
      return;
    }

    setImportingPhotoId(photoId);
    setNotice(null);

    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(restaurant.id)}/google-photos/import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoId,
          }),
        },
      );

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to import Google photo.');
      }

      setNotice({
        tone: 'success',
        message: 'Google photo imported into gallery.',
      });
      await loadGallery();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to import Google photo.';
      setNotice({
        tone: 'error',
        message,
      });
    } finally {
      setImportingPhotoId(null);
    }
  };

  const onUpload = async () => {
    setNotice({
      tone: 'success',
      message: 'Gallery image uploaded.',
    });
    await loadGallery();
  };

  const importedGooglePhotoIds = new Set(
    items
      .filter((item) => item.source === 'google' && item.external_id)
      .map((item) => item.external_id as string),
  );

  return (
    <section className="space-y-5">
      <Header
        title="Gallery"
        subtitle="Upload and manage gallery images for the selected restaurant."
        restaurantName={restaurant.name}
      />

      <div className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <FormMessage notice={notice} />
        <FileUpload
          accept="image"
          label="Upload gallery image"
          description="Add a restaurant image to the gallery."
          restaurantId={restaurant.id}
          onUpload={onUpload}
        />
      </div>

      <div className="space-y-4 rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#111827]">Google Place Photos</h2>
          <button
            type="button"
            onClick={() => void loadGooglePhotos()}
            disabled={isGoogleLoading}
            className="inline-flex items-center rounded-lg border border-[#d2dde2] px-3 py-2 text-xs font-semibold text-[#1f2937] transition hover:bg-[#f4f7f9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGoogleLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {isGoogleLoading ? (
          <p className="text-[#5f6c78]">Loading Google photos...</p>
        ) : googlePhotos.length === 0 ? (
          <p className="text-[#5f6c78]">No Google photos found for this place.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {googlePhotos.map((photo, index) => {
              const isImported = importedGooglePhotoIds.has(photo.photo_id);
              const isImporting = importingPhotoId === photo.photo_id;

              return (
                <article
                  key={photo.photo_id}
                  className="overflow-hidden rounded-2xl border border-[#d7e2e6] bg-[#f8fafb]"
                >
                  <div className="relative h-40 w-full">
                    <Image
                      src={photo.preview_url}
                      alt={`Google place photo ${index + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-3 p-3">
                    <p className="text-xs text-[#60707c]">
                      {photo.width && photo.height
                        ? `${photo.width} x ${photo.height}`
                        : 'Google Place photo'}
                    </p>
                    <button
                      type="button"
                      disabled={isImported || isImporting}
                      onClick={() => void onImportGooglePhoto(photo.photo_id)}
                      className="inline-flex items-center rounded-lg border border-[#88c39b] px-3 py-1.5 text-xs font-semibold text-[#25613d] transition hover:bg-[#ecf8f0] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isImported
                        ? 'Imported'
                        : isImporting
                          ? 'Importing...'
                          : 'Import to gallery'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[#d7e2e6] bg-white p-8">
        <h2 className="text-2xl font-semibold text-[#111827]">Existing Images</h2>

        {isLoading ? (
          <p className="mt-4 text-[#5f6c78]">Loading gallery...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-[#5f6c78]">No gallery images found yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[#d7e2e6] bg-[#f8fafb]"
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={item.url}
                    alt={`Gallery image ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="space-y-3 p-3">
                  <p className="text-xs text-[#60707c]">
                    {item.source === 'google' ? 'Imported' : 'Uploaded'}{' '}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : 'recently'}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96]">
                    {item.source === 'google' ? 'Google' : 'Manual'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void onDeleteItem(item.id)}
                    className="inline-flex items-center rounded-lg border border-[#f2b3b3] px-3 py-1.5 text-xs font-semibold text-[#9b1c1c] transition hover:bg-[#fef2f2]"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
