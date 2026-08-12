import { AuthService } from './auth.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  const usersRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn((e: any) => e),
    save: jest.fn(async (e: any) => e),
    delete: jest.fn(),
  });
  const jwtService = {
    sign: jest.fn(() => 'jwt-token'),
  };

  it('US-01-1: registro con email nuevo → devuelve token + user', async () => {
    const repo = usersRepo();
    repo.findOne.mockResolvedValue(null);
    const service = new AuthService(repo as any, jwtService as any);
    const result = await service.register({ email: 'new@example.com', password: 'secret123', displayName: 'Casa' });
    expect(result.token).toBe('jwt-token');
    expect(result.user.email).toBe('new@example.com');
    expect(repo.create).toHaveBeenCalled();
  });

  it('US-01-2: email ya registrado → 409 EMAIL_IN_USE', async () => {
    const repo = usersRepo();
    repo.findOne.mockResolvedValue({ id: 'u1', email: 'casa@example.com' });
    const service = new AuthService(repo as any, jwtService as any);
    await expect(
      service.register({ email: 'CASA@example.com', password: 'secret123' }),
    ).rejects.toThrow('EMAIL_IN_USE');
  });

  it('US-02-1: login con credenciales correctas → token', async () => {
    const repo = usersRepo();
    repo.findOne.mockResolvedValue({
      id: 'u1',
      email: 'casa@example.com',
      passwordHash: await bcrypt.hash('secret123', 10),
      displayName: null,
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      createdAt: new Date(),
    });
    const service = new AuthService(repo as any, jwtService as any);
    const result = await service.login({ email: 'casa@example.com', password: 'secret123' });
    expect(result.token).toBe('jwt-token');
  });

  it('US-02-2: contraseña incorrecta → 401 INVALID_CREDENTIALS', async () => {
    const repo = usersRepo();
    repo.findOne.mockResolvedValue({
      id: 'u1',
      email: 'casa@example.com',
      passwordHash: await bcrypt.hash('secret123', 10),
    });
    const service = new AuthService(repo as any, jwtService as any);
    await expect(
      service.login({ email: 'casa@example.com', password: 'wrong' }),
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('US-02-3: email no existe → 401 INVALID_CREDENTIALS (sin leak de existencia)', async () => {
    const repo = usersRepo();
    repo.findOne.mockResolvedValue(null);
    const service = new AuthService(repo as any, jwtService as any);
    await expect(
      service.login({ email: 'ghost@example.com', password: 'whatever' }),
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('US-19: hash bcrypt — la contraseña se guarda hasheada', async () => {
    const repo = usersRepo();
    repo.findOne.mockResolvedValue(null);
    const service = new AuthService(repo as any, jwtService as any);
    await service.register({ email: 'a@b.com', password: 'secret123' });
    const created = repo.create.mock.calls[0][0];
    expect(created.passwordHash).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', created.passwordHash)).toBe(true);
  });
});
