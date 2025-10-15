'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface Agency {
  id: number;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  default_markup_percentage: number;
  currency: string;
  status: string;
  subscription_type: string;
}

export default function AgencySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [agency, setAgency] = useState<Agency | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Turkey');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e40af');
  const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
  const [defaultMarkup, setDefaultMarkup] = useState(15);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadAgency();
    }
  }, [session]);

  const loadAgency = async () => {
    try {
      setIsLoading(true);
      console.log('[Agency Settings] Fetching agency data...');
      const response = await fetch('/api/agencies');
      const data = await response.json();

      console.log('[Agency Settings] Response:', {
        ok: response.ok,
        status: response.status,
        data
      });

      // Handle both single agency and agencies array (for admin)
      let agencyData = null;
      if (data.agency) {
        agencyData = data.agency;
      } else if (data.agencies && data.agencies.length > 0) {
        // If admin, find their personal agency (not System Admin)
        agencyData = data.agencies.find((a: Agency) => a.company_name !== 'System Admin') || data.agencies[0];
      }

      if (response.ok && agencyData) {
        console.log('[Agency Settings] Agency found:', agencyData);
        setAgency(agencyData);
        populateForm(agencyData);
      } else {
        console.log('[Agency Settings] No agency in response');
        showMessage('No agency found for your account', 'error');
      }
    } catch (error) {
      console.error('[Agency Settings] Error loading agency:', error);
      showMessage('Failed to load agency settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const populateForm = (agencyData: Agency) => {
    setCompanyName(agencyData.company_name);
    setContactPerson(agencyData.contact_person || '');
    setEmail(agencyData.email || '');
    setPhone(agencyData.phone || '');
    setWebsite(agencyData.website || '');
    setAddress(agencyData.address || '');
    setCity(agencyData.city || '');
    setCountry(agencyData.country);
    setLogoUrl(agencyData.logo_url || '');
    setPrimaryColor(agencyData.primary_color);
    setSecondaryColor(agencyData.secondary_color);
    setDefaultMarkup(agencyData.default_markup_percentage);
    setCurrency(agencyData.currency);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agency) {
      showMessage('No agency found', 'error');
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(`/api/agencies/${agency.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          contact_person: contactPerson,
          email,
          phone,
          website,
          address,
          city,
          country,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          default_markup_percentage: defaultMarkup,
          currency
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAgency(data.agency);
        showMessage('Settings saved successfully!', 'success');
      } else {
        const error = await response.json();
        showMessage(error.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving agency:', error);
      showMessage('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No agency found. Please contact administrator.</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Navigation */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Dashboard
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-600">
            {session?.user?.name} ({session?.user?.email})
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agency Settings</h1>
        <p className="text-gray-600">
          Manage your agency profile and white-label branding
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-6xl mx-auto mb-4">
          <div
            className={`p-4 rounded-lg ${
              messageType === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="max-w-6xl mx-auto space-y-6">
        {/* Company Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Company Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.example.com"
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">White-Label Branding</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full p-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL to your company logo (will be used in PDF/DOCX exports)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Pricing Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Markup (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={defaultMarkup}
                onChange={(e) => setDefaultMarkup(parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your default profit margin on quotes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="TRY">TRY - Turkish Lira</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscription Info (Read-only) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Subscription</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="p-2 bg-gray-100 rounded text-gray-700">
                <span className={`inline-block px-2 py-1 rounded text-sm ${
                  agency.status === 'active' ? 'bg-green-100 text-green-800' :
                  agency.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {agency.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <div className="p-2 bg-gray-100 rounded text-gray-700">
                <span className="inline-block px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                  {agency.subscription_type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
