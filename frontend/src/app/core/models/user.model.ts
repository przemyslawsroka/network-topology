export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  domain?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface GoogleCredential {
  credential: string;
  select_by: string;
}
