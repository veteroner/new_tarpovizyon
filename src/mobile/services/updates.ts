const API_BASE = '/api.php';
const API_KEY = 'dashboard_secret_key_2024';

export interface Announcement {
  id: string;
  title: string;
  time_label: string;
  color: string; // Tailwind class e.g. 'bg-emerald-500'
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(`${API_BASE}?action=get_announcements`, {
    headers: { 'X-API-Key': API_KEY },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const json = await res.json();
  return json.announcements ?? [];
}
