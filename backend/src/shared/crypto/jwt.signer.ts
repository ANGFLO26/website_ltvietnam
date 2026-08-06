import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type {
  ResetClaims,
  ResetTokenSigner,
  SessionClaims,
  TokenSigner,
} from '../../services/auth/crypto.port.js';

const ALG = 'HS256';
const ISSUER = 'ltvietnam';

/**
 * Ky the bang HS256 (bi mat doi xung).
 *
 * Vi sao khong dung RS256: chi MOT ben ky va cung MOT ben kiem. Khoa bat doi
 * xung chi dang gia khi ben kiem khong duoc phep ky — vi du khi mot dich vu
 * khac phai xac minh the ma khong duoc phat the. O day khong co tinh huong do.
 */
function keyOf(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export class JwtSessionSigner implements TokenSigner {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = keyOf(secret);
  }

  async sign(claims: SessionClaims, ttlSeconds: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ role: claims.role, pwd: claims.pwd })
      .setProtectedHeader({ alg: ALG })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      // `aud` phan biet the PHIEN voi the DAT LAI MAT KHAU. Hai loai the deu
      // ky HS256, nen khong co `aud` thi mot the loai nay dung duoc cho loai
      // kia neu ai do vo tinh cau hinh chung bi mat.
      .setAudience('session')
      .setIssuedAt(now)
      .setExpirationTime(now + ttlSeconds)
      .sign(this.key);
  }

  async verify(token: string): Promise<SessionClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: 'session',
        algorithms: [ALG],   // chan tan cong doi `alg` sang `none`
      });
      return toSession(payload);
    } catch {
      // Sai chu ky, het han, sai `aud`, sai dinh dang — tat ca deu la
      // "khong co phien", khong phai loi he thong.
      return null;
    }
  }
}

export class JwtResetSigner implements ResetTokenSigner {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = keyOf(secret);
  }

  async sign(claims: ResetClaims, ttlSeconds: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ pwd: claims.pwd })
      .setProtectedHeader({ alg: ALG })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setAudience('password-reset')
      .setIssuedAt(now)
      .setExpirationTime(now + ttlSeconds)
      .sign(this.key);
  }

  async verify(token: string): Promise<ResetClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: 'password-reset',
        algorithms: [ALG],
      });
      const sub = payload.sub;
      const pwd = payload['pwd'];
      if (typeof sub !== 'string' || typeof pwd !== 'number') return null;
      return { sub, pwd };
    } catch {
      return null;
    }
  }
}

function toSession(payload: JWTPayload): SessionClaims | null {
  const sub = payload.sub;
  const role = payload['role'];
  const pwd = payload['pwd'];
  // Kiem tung truong: the co chu ky dung van co the thieu truong neu duoc
  // phat boi mot phien ban cu cua ma nguon.
  if (typeof sub !== 'string' || typeof role !== 'string' || typeof pwd !== 'number') {
    return null;
  }
  return { sub, role, pwd };
}
