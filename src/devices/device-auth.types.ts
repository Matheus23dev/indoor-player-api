export interface AuthenticatedDevice {
  id: string;
  code: string;
  name: string | null;
  companyId: string;
  isLinked: true;
}
