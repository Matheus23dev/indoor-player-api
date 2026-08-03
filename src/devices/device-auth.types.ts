export interface AuthenticatedDevice {
  id: string;
  code: string;
  name: string | null;
  companyId: string;
  isLinked: true;
  currentPlaylistId: string | null;
  currentPlaylistItemId: string | null;
  currentMediaId: string | null;
}
