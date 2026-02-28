import { API_BASE_URL, USE_MOCK_API } from '@/api/config';
import { fetchJson } from '@/api/http';
import type { User } from '@/domain/types';
import { loadMockDb, saveMockDb, selectPublicUser } from '@/mock/mockDb';

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  inviteCode: string;
  firstName: string;
  lastName: string;
};

export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type AuthSession = {
  user: User;
  sessionToken: string; // in mock it is userId; in real backend it will be JWT/opaque token
};

export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  getMe(sessionToken: string): Promise<User>;
  updateProfile(sessionToken: string, input: UpdateProfileInput): Promise<User>;
  changePassword(sessionToken: string, input: ChangePasswordInput): Promise<void>;
}

const mockAuthApi: AuthApi = {
  async login(input) {
    const db = loadMockDb();
    const u = db.users.find((x) => x.email.toLowerCase() === input.email.toLowerCase());
    if (!u || u.password !== input.password) {
      throw new Error('Неверные данные');
    }
    return { user: selectPublicUser(u), sessionToken: u.id };
  },

  async register(input) {
    const db = loadMockDb();

    const email = input.email.trim().toLowerCase();
    if (db.users.some((x) => x.email.toLowerCase() === email)) {
      throw new Error('Пользователь уже зарегистрирован');
    }

    const invite = db.inviteCodes.find((c) => c.code === input.inviteCode);
    if (!invite || invite.status !== 'ACTIVE' || invite.usedCount >= invite.maxUses) {
      throw new Error('Инвайт-код недействителен');
    }

    const userId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());

    const nextDb = {
      ...db,
      inviteCodes: db.inviteCodes.map((c) =>
        c.code === invite.code ? { ...c, usedCount: c.usedCount + 1 } : c
      ),
      users: [
        ...db.users,
        {
          id: userId,
          email,
          password: input.password,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          avatarUrl: undefined,
          role: invite.targetRole,
          status: 'ACTIVE',
        },
      ],
    };

    saveMockDb(nextDb);

    const created = nextDb.users.find((x) => x.id === userId)!;
    return { user: selectPublicUser(created), sessionToken: created.id };
  },

  async getMe(sessionToken) {
    const db = loadMockDb();
    const u = db.users.find((x) => x.id === sessionToken);
    if (!u) throw new Error('Сессия истекла');
    return selectPublicUser(u);
  },

  async updateProfile(sessionToken, input) {
    const db = loadMockDb();
    const idx = db.users.findIndex((x) => x.id === sessionToken);
    if (idx < 0) throw new Error('Сессия истекла');

    const u = db.users[idx]!;
    const next = {
      ...u,
      firstName: input.firstName ?? u.firstName,
      lastName: input.lastName ?? u.lastName,
      avatarUrl: input.avatarUrl ?? u.avatarUrl,
    };

    const nextDb = { ...db, users: db.users.map((x) => (x.id === sessionToken ? next : x)) };
    saveMockDb(nextDb);
    return selectPublicUser(next);
  },

  async changePassword(sessionToken, input) {
    const db = loadMockDb();
    const u = db.users.find((x) => x.id === sessionToken);
    if (!u) throw new Error('Сессия истекла');
    if (u.password !== input.currentPassword) throw new Error('Текущий пароль неверный');

    const nextDb = {
      ...db,
      users: db.users.map((x) => (x.id === sessionToken ? { ...x, password: input.newPassword } : x)),
    };
    saveMockDb(nextDb);
  },
};

const realAuthApi: AuthApi = {
  async login(input) {
    /**
     * BACKEND INTEGRATION (placeholder)
     * Expected endpoint: POST /auth/login { email, password }
     */
    const res = await fetchJson<AuthSession>(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res;
  },

  async register(input) {
    /**
     * BACKEND INTEGRATION (placeholder)
     * Expected endpoint: POST /auth/register { email, password, inviteCode, firstName, lastName }
     */
    const res = await fetchJson<AuthSession>(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res;
  },

  async getMe(sessionToken) {
    /** BACKEND INTEGRATION (placeholder): GET /auth/me */
    return await fetchJson<User>(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
  },

  async updateProfile(sessionToken, input) {
    /** BACKEND INTEGRATION (placeholder): PATCH /users/me */
    return await fetchJson<User>(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify(input),
    });
  },

  async changePassword(sessionToken, input) {
    /** BACKEND INTEGRATION (placeholder): POST /users/me/change-password */
    await fetchJson<void>(`${API_BASE_URL}/users/me/change-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify(input),
    });
  },
};

export const authApi: AuthApi = USE_MOCK_API ? mockAuthApi : realAuthApi;
