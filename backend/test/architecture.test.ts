import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * TEST KIEN TRUC — sau luat, ep tu dong.
 *
 * Kien truc do MAY canh. Sai la BUILD DO, khong phai gop y luc review.
 *
 * Ba tang:  api/  ->  services/  ->  dao/
 * Moi thu muc bang trong dao/ phai du bon thanh phan.
 */
const SRC = resolve(import.meta.dirname, '../src');
const DAO_DIR = join(SRC, 'dao');

/** Thu muc trong dao/ khong phai bang (ha tang cua chinh tang dao). */
const NON_TABLE = new Set<string>([]);

interface SourceFile {
  readonly path: string;
  readonly body: string;
  /** Than file da BO COMMENT — luat kien truc phan tich MA, khong phan tich van xuoi. */
  readonly code: string;
  readonly imports: string[];
}

/** Bo comment khoi va comment dong de khong bat nham chu trong chu thich. */
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

const FILES: SourceFile[] = walk(SRC).map((full) => {
  const body = readFileSync(full, 'utf8');
  return {
    path: relative(SRC, full).replaceAll('\\', '/'),
    body,
    code: stripComments(body),
    imports: [...body.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!),
  };
});

const resolveImport = (from: string, spec: string): string | null =>
  spec.startsWith('.')
    ? relative(SRC, resolve(join(SRC, from, '..'), spec)).replaceAll('\\', '/')
    : null;

const layerOf = (p: string): 'api' | 'services' | 'dao' | 'shared' | null => {
  const m = /^(api|services|dao|shared)\//.exec(p);
  return m ? (m[1] as 'api' | 'services' | 'dao' | 'shared') : null;
};

const tableDirs = existsSync(DAO_DIR)
  ? readdirSync(DAO_DIR).filter(
      (n) => statSync(join(DAO_DIR, n)).isDirectory() && !NON_TABLE.has(n),
    )
  : [];

/**
 * NGOAI LE DUY NHAT cua Luat 1: `dao/<bang>/object.ts`.
 *
 * Luat nay bao dong khi `api/dto/user.view.ts` import `dao/users/object.js`, va
 * cai no chi ra la mot cho DAT SAI TEN chu khong phai mot vi pham:
 *
 * `object.ts` la THUC THE NGHIEP VU, khong phai chi tiet cua tang dao. Chu
 * thich dau file cua chinh no viet nhu vay: "Thuc the nghiep vu `User` — KHONG
 * phai hang trong bang". No nam trong `dao/` vi Luat 4 xep bon file cua mot
 * bang canh nhau, khong phai vi no thuoc tang dao. Bang chung: `services/`
 * cung import no, va `AuthService.login` da tra ve thuc the do ra tang api tu
 * truoc — tang api VAN LUON cham thuc the, chi la truoc day no khong dat ten
 * (`Promise<{ user: unknown }>`, tra thang thuc the ra ngoai).
 *
 * Cach dung khac la don `object.ts` sang mot thu muc `domain/` rieng. Do la
 * viec cho 23 bang, va no pha Luat 4. Chua lam bay gio; ghi lai o day de lan
 * sau ai doc thi biet day la mot lua chon, khong phai mot su tinh co.
 *
 * Noi long TOI DAU:
 *   - CHI `dao/<bang>/object.ts`. `dao.ts`, `dao.interface.ts`, `mapper.ts`,
 *     `query.ts`, `dao-manager.ts`, `connection.ts` van bi chan tuyet doi.
 *   - CHI `import type`. Import gia tri se cho phep goi mot cai gi do; import
 *     kieu thi bien mat sau khi bien dich va khong the chay duoc.
 *
 * Nhung duong tan cong that su van bi chan boi luat khac, khong phai luat nay:
 * Luat 2 chan kieu bang cua Kysely lot ra ngoai `dao.ts`/`mapper.ts`, va Luat 9
 * chan viec tiem `DAO_MANAGER` vao controller.
 */
const CHO_PHEP_TU_DAO = /^dao\/[^/]+\/object\.(ts|js)$/;

describe('Luat 1 — api/ khong duoc import dao/', () => {
  it('controller phai di qua services/', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      if (layerOf(f.path) !== 'api') continue;
      for (const spec of f.imports) {
        const t = resolveImport(f.path, spec);
        if (!t || layerOf(t) !== 'dao') continue;

        if (CHO_PHEP_TU_DAO.test(t)) {
          // Ngoai le CHI ap dung cho `import type`.
          const laKieu = new RegExp(
            `import\\s+type[^;]*from\\s*['"]${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
          ).test(f.code);
          if (laKieu) continue;
          bad.push(`${f.path} -> ${spec} (thuc the chi duoc "import type")`);
          continue;
        }
        bad.push(`${f.path} -> ${spec}`);
      }
    }
    expect(bad, `Tang api khong duoc cham thang tang dao:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('Luat 2 — chi dao/ duoc import kysely va pg', () => {
  it('driver khong lot ra ngoai tang dao', () => {
    const drivers = ['kysely', 'pg'];
    const bad: string[] = [];
    for (const f of FILES) {
      if (layerOf(f.path) === 'dao') continue;
      for (const spec of f.imports) {
        if (drivers.includes(spec))
          bad.push(`${f.path} -> ${spec} (tang ${layerOf(f.path) ?? 'goc'})`);
      }
    }
    expect(bad, `Chi tang dao duoc biet driver:\n${bad.join('\n')}`).toEqual([]);
  });

  /**
   * Hai dieu da hoc duoc tu chinh luat nay khi no bao dong gia:
   *
   * 1. Mau PHAI bat dau bang chu HOA (`[A-Z]\w*Table`). Ban truoc dung
   *    `\w+Table\b` va khop ca ten thuoc tinh `trTable`, `parentTable` —
   *    dinh danh viet thuong khong bao gio la kieu hang cua Kysely.
   * 2. Kieu la TEN BANG duoi dang chuoi phai ket thuc bang `...TableName`.
   *    `TreeTableName` va `SluggedTableName` da theo quy uoc do tu truoc;
   *    mot kieu moi dat ten `TranslationTable` da lam luat nay do.
   *
   * Ca hai lan sua deu la thu hep dung cho, khong phai noi long: luat van
   * bat duoc `Selectable<ProductsTable>` lot ra ngoai `dao.ts`/`mapper.ts`,
   * va phep tiem loi o duoi chung minh dieu do.
   */
  it('kieu bang cua Kysely chi xuat hien trong dao.ts va mapper.ts', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      const isDaoImpl = /\/(dao|mapper|connection|dao-manager)\.ts$/.test(f.path);
      if (isDaoImpl) continue;
      if (/\bSelectable<|Insertable<|Updateable<|\b[A-Z]\w*Table\b/.test(f.code)) bad.push(f.path);
    }
    expect(
      bad,
      `Kieu hang cua bang chi duoc dung trong dao.ts/mapper.ts:\n${bad.join('\n')}`,
    ).toEqual([]);
  });
});

describe('Luat 3 — services/ khong import cai dat DAO, chi import interface', () => {
  it('service phu thuoc dao.interface, khong phu thuoc dao.ts', () => {
    const bad: string[] = [];
    for (const f of FILES) {
      if (layerOf(f.path) !== 'services') continue;
      for (const spec of f.imports) {
        const t = resolveImport(f.path, spec);
        // Import spec giu duoi `.js` sau khi bien dich, nen phai bat ca hai duoi.
        // (Phep thu tiem loi phat hien: regex chi bat `.ts` KHONG BAO GIO khop.)
        if (t && /^dao\/[^/]+\/dao\.(ts|js)$/.test(t)) bad.push(`${f.path} -> ${spec}`);
      }
    }
    expect(bad, `Service chi duoc phu thuoc dao.interface.ts:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('Luat 4 — moi thu muc bang du bon thanh phan', () => {
  it('co object.ts, dao.interface.ts, dao.ts, mapper.ts', () => {
    const required = ['object.ts', 'dao.interface.ts', 'dao.ts', 'mapper.ts'];
    const missing: string[] = [];
    for (const dir of tableDirs) {
      for (const f of required) {
        if (!existsSync(join(DAO_DIR, dir, f))) missing.push(`dao/${dir}/${f}`);
      }
    }
    expect(missing, `Thieu thanh phan bat buoc:\n${missing.join('\n')}`).toEqual([]);
  });

  it('co it nhat mot thu muc bang', () => {
    expect(tableDirs.length).toBeGreaterThan(0);
  });

  it('khong co file la nam thang trong thu muc bang', () => {
    const allowed = new Set(['object.ts', 'dao.interface.ts', 'dao.ts', 'mapper.ts', 'query.ts']);
    const bad: string[] = [];
    for (const dir of tableDirs) {
      for (const f of readdirSync(join(DAO_DIR, dir))) {
        if (f.endsWith('.ts') && !f.endsWith('.test.ts') && !allowed.has(f))
          bad.push(`dao/${dir}/${f}`);
      }
    }
    expect(bad, `Chi cho phep object/dao.interface/dao/mapper/query:\n${bad.join('\n')}`).toEqual(
      [],
    );
  });
});

describe('Luat 5 — dao.ts phai implements interface trong dao.interface.ts', () => {
  it('moi cai dat deu khai bao implements', () => {
    const bad: string[] = [];
    for (const dir of tableDirs) {
      const iface = readFileSync(join(DAO_DIR, dir, 'dao.interface.ts'), 'utf8');
      const impl = readFileSync(join(DAO_DIR, dir, 'dao.ts'), 'utf8');
      const name = /export interface (\w+Dao)\b/.exec(iface)?.[1];
      if (!name) {
        bad.push(`dao/${dir}/dao.interface.ts: khong tim thay "export interface <Ten>Dao"`);
        continue;
      }
      if (!new RegExp(`implements\\s+${name}\\b`).test(impl)) {
        bad.push(`dao/${dir}/dao.ts: thieu "implements ${name}"`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});

describe('Luat 6 — DAO khong nhan executor lam tham so', () => {
  /**
   * DAO lay tu `tx` cua DaoManager da gan san transaction. Neu phuong thuc
   * nhan them executor thi lai quay ve bay "quen truyen" ma DaoManager sinh ra
   * de tranh.
   */
  it('chu ky phuong thuc khong co executor', () => {
    const bad: string[] = [];
    for (const dir of tableDirs) {
      const iface = readFileSync(join(DAO_DIR, dir, 'dao.interface.ts'), 'utf8');
      if (/\(\s*(ex|executor|trx|tx)\s*:/.test(iface)) bad.push(`dao/${dir}/dao.interface.ts`);
    }
    expect(bad, `DAO khong duoc nhan executor:\n${bad.join('\n')}`).toEqual([]);
  });
});

/**
 * Luat 7 — DAO viet ra ma khong noi vao manager thi khong ai goi duoc.
 *
 * Vi sao can luat nay: bon luat truoc kiem HINH DANG cua thu muc bang, khong
 * kiem no co duoc DUNG hay khong. Mot thu muc du bon file, `implements` day
 * du, bien dich sach — nhung neu quen mot dong trong `AllDaos` thi no la ma
 * chet, va khong co gi bao. Da them sau thu muc trong mot lan lam viec nen
 * kha nang quen la co that.
 */
describe('Luat 7 — moi thu muc bang phai duoc noi vao DaoManager', () => {
  const manager = readFileSync(join(DAO_DIR, 'dao-manager.ts'), 'utf8');
  const managerCode = stripComments(manager);

  it('dao-manager.ts import cai dat cua moi bang', () => {
    const missing = tableDirs.filter((d) => !managerCode.includes(`./${d}/dao.js`));
    expect(missing, `Chua import trong dao-manager.ts:\n${missing.join('\n')}`).toEqual([]);
  });

  it('moi lop cai dat duoc khoi tao trong buildDaos', () => {
    const build = /function buildDaos[\s\S]*?\n}/.exec(managerCode)?.[0] ?? '';
    expect(build.length, 'Khong tim thay buildDaos').toBeGreaterThan(0);

    const missing: string[] = [];
    for (const dir of tableDirs) {
      const daoSrc = stripComments(readFileSync(join(DAO_DIR, dir, 'dao.ts'), 'utf8'));
      const cls = /export class (\w+)/.exec(daoSrc)?.[1];
      if (!cls) { missing.push(`dao/${dir}/dao.ts: khong tim thay export class`); continue; }
      if (!new RegExp(`new\\s+${cls}\\s*\\(`).test(build)) missing.push(`${cls} (dao/${dir})`);
    }
    expect(missing, `Chua khoi tao trong buildDaos:\n${missing.join('\n')}`).toEqual([]);
  });

  it('AllDaos khai bao dung so luong bang — khong thua, khong thieu', () => {
    const allDaos = /export interface AllDaos \{[\s\S]*?\n}/.exec(managerCode)?.[0] ?? '';
    const props = [...allDaos.matchAll(/readonly (\w+):/g)].map((m) => m[1]!);
    expect(props.length, `AllDaos co ${props.length} muc, co ${tableDirs.length} thu muc bang`)
      .toBe(tableDirs.length);
  });
});

/**
 * Luat 9 — api/ khong duoc TIEM DAO manager.
 *
 * Luat 1 quet DUONG DAN import va chan `api/ -> dao/`. No khong du:
 * `DAO_MANAGER` la mot Symbol export tu `shared/tokens.ts`, KHONG phai tu
 * `dao/`. Nen mot controller viet
 *
 *     import { DAO_MANAGER } from '../../shared/tokens.js';
 *     constructor(@Inject(DAO_MANAGER) private readonly daos) {}
 *
 * se co quyen vao ca 23 DAO, di vong hoan toan qua tang service — va Luat 1
 * IM LANG cho qua vi khong co duong dan nao tro toi `dao/`.
 *
 * Lo hong nay do mot cau hoi cua nguoi dung phat hien ra, khong phai do test.
 * Bay luat truoc kiem "co import sai khong"; khong luat nao hoi "co lay duoc
 * DAO bang duong khac khong".
 */
describe('Luat 9 — api/ khong duoc tiem DAO manager', () => {
  it('khong controller nao nhac toi DAO_MANAGER', () => {
    const bad = FILES
      .filter((f) => layerOf(f.path) === 'api')
      .filter((f) => /\bDAO_MANAGER\b|\bDaoManager\b|\bDaoScope\b/.test(f.code))
      .map((f) => f.path);
    expect(
      bad,
      `Tang api phai di qua services/, khong duoc giu DAO manager:\n${bad.join('\n')}`,
    ).toEqual([]);
  });

  it('api/ chi tiem token dich vu hoac ha tang, khong tiem gi khac', () => {
    /**
     * Danh sach TRANG cho nhung gi tang api duoc phep tiem.
     *
     * Mac dinh la TU CHOI: mot token moi xuat hien trong controller ma khong
     * co trong danh sach nay se lam test do, va nguoi them no phai giai thich
     * tai sao tang HTTP can no. Danh sach den thi nguoc lai — thu nguy hiem
     * chi bi chan neu ai do da nghi ra truoc.
     */
    /**
     * `RATE_LIMIT_REGISTRY` la HA TANG CUA TANG API, khong phai duong vao du
     * lieu — no chi giu bo dem trong bo nho. Them vao danh sach trang mot cach
     * TUONG MINH thay vi doi ten thanh `*_SERVICE` cho lot luat: doi ten se
     * lam nguoi doc tuong day la mot service nghiep vu.
     */
    const CHO_PHEP = /^([A-Z_]+_SERVICE|APP_CONFIG|LOGGER|Reflector|RATE_LIMIT_REGISTRY)$/;
    const bad: string[] = [];
    for (const f of FILES) {
      if (layerOf(f.path) !== 'api') continue;
      for (const m of f.code.matchAll(/@Inject\(\s*([A-Za-z_][\w]*)\s*\)/g)) {
        if (!CHO_PHEP.test(m[1]!)) bad.push(`${f.path}: @Inject(${m[1]})`);
      }
    }
    expect(bad, `Token khong duoc phep o tang api:\n${bad.join('\n')}`).toEqual([]);
  });
});

/**
 * Luat 8 — MOI bang trong so do phai duoc mot DAO nao do cham toi.
 *
 * Vi sao can: bay luat truoc kiem NHUNG GI DA VIET co dung hinh dang khong.
 * Khong luat nao hoi "con bang nao chua ai dung toi khong". Ba bang lien ket
 * cua `services` da bi bo sot dung mot vong lam viec ma khong co gi bao —
 * chi lo ra khi doi chieu tay so do voi ma nguon.
 *
 * Bang lien ket khong co thu muc rieng (chung song trong DAO cua bang cha),
 * nen phep kiem la "co xuat hien trong mot file dao.ts/query.ts nao do", chu
 * khong phai "co thu muc rieng".
 */
describe('Luat 8 — khong bang nao trong so do bi bo quen', () => {
  const SCHEMA = resolve(import.meta.dirname, '../../doc/verify/v1.3/schema_up.sql');

  it('moi bang deu duoc mot DAO cham toi', () => {
    if (!existsSync(SCHEMA)) {
      throw new Error(`Khong tim thay so do de doi chieu: ${SCHEMA}`);
    }
    const ddl = readFileSync(SCHEMA, 'utf8');
    const tables = [...ddl.matchAll(/CREATE TABLE ltv\.(\w+)/g)].map((m) => m[1]!);
    expect(tables.length, 'khong doc duoc bang nao tu so do').toBeGreaterThan(40);

    // Gop toan bo ma tang dao lai roi tim ten bang duoi dang chuoi.
    const daoCode = FILES.filter((f) => layerOf(f.path) === 'dao')
      .map((f) => f.code).join('\n');

    const missing = tables.filter((t) => !new RegExp(`['"\`]${t}['"\`]`).test(daoCode));
    expect(
      missing,
      `Bang co trong so do nhung khong DAO nao cham toi:\n${missing.join('\n')}`,
    ).toEqual([]);
  });
});

/**
 * Luat 10 — VO PHAN HOI la mot quyet dinh, o mot cho.
 *
 * `EnvelopeInterceptor` boc moi phan hoi thanh `{ data }` / `{ data, meta }`.
 * Ba cach lam no ro ri, va ca ba deu im lang:
 *
 *   a. controller TU boc (`return { data: ... }`) -> `{ data: { data: ... } }`
 *   b. controller tra mot vo tu che (`{ user: ... }`, `{ ok: true }`) -> vo
 *      long vo, va hinh dang `data` khac nhau o tung endpoint
 *   c. ai do gan `@NoEnvelope()` de di qua cho bat tien -> hop dong ra ro dan
 *      tung endpoint mot
 *
 * Luat nay chi doc PHAN THAN CUA HANDLER (tu mot decorator route den decorator
 * route tiep theo), khong doc ca file: mot ham phu tra ve kieu doi tuong noi
 * dong la vo hai, con mot handler thi khong.
 */
const ROUTE_DECORATOR = /@(?:Get|Post|Put|Patch|Delete|Head|Options|All)\s*\(/g;

interface Handler {
  readonly file: string;
  /** Ma tu decorator route den decorator route ke tiep. */
  readonly slice: string;
  readonly mienVo: boolean;
}

function handlersOf(f: SourceFile): Handler[] {
  const starts = [...f.code.matchAll(ROUTE_DECORATOR)].map((m) => m.index);
  // `@NoEnvelope()` o cap LOP mien cho moi handler trong file do.
  const mienCapLop = /@NoEnvelope\s*\(\s*\)/.test(f.code.split(/@Controller\s*\(/)[0] ?? '');
  return starts.map((start, i) => {
    const slice = f.code.slice(start, starts[i + 1] ?? f.code.length);
    return { file: f.path, slice, mienVo: mienCapLop || /@NoEnvelope\s*\(\s*\)/.test(slice) };
  });
}

const API_HANDLERS = FILES.filter((f) => layerOf(f.path) === 'api').flatMap(handlersOf);

describe('Luat 10 — controller khong duoc tu boc vo phan hoi', () => {
  it('quet tim thay handler — neu khong thi ba phep kiem duoi la rong', () => {
    /**
     * Phep kiem nay ton tai vi ba phep kiem duoi deu co dang "danh sach vi pham
     * phai rong". Neu bo quet handler hong (doi ten decorator, doi cach viet)
     * thi danh sach rong VI KHONG QUET GI CA, va ca ba se xanh mot cach vo
     * nghia. Da bi mot lan roi voi test on dinh phan trang.
     */
    expect(API_HANDLERS.length).toBeGreaterThan(5);
    expect(API_HANDLERS.filter((h) => h.mienVo).length).toBeGreaterThan(0);
  });

  it('10a — khong handler nao dat khoa `data` trong phan hoi', () => {
    const bad = API_HANDLERS.filter((h) => !h.mienVo)
      .filter((h) => /\bdata\s*:/.test(h.slice))
      .map((h) => h.file);
    expect(
      bad,
      `Vo do EnvelopeInterceptor dat. Controller tra TAI NGUYEN:\n${bad.join('\n')}`,
    ).toEqual([]);
  });

  it('10b — kieu tra ve phai co TEN, khong duoc la doi tuong noi dong', () => {
    /**
     * `Promise<{ user: unknown }>` la ca hai loi cung mot luc: mot vo tu che,
     * va mot hop dong khong the tra cuu o dau ca. Bat phai dat ten thi:
     *
     *   - `data` cua tung endpoint co mot dinh nghia doc duoc
     *   - dat ten buoc phai CHON truong, va do la luc phat hien minh dang tra
     *     ca `passwordChangedAt` ra ngoai (van de so 9 cua `doc/13`)
     */
    const bad = API_HANDLERS.filter((h) => !h.mienVo)
      .filter((h) => /\)\s*:\s*(?:Promise<\s*)?\{/.test(h.slice))
      .map((h) => `${h.file}: ${/\)\s*:\s*(?:Promise<\s*)?\{[^}]*\}/.exec(h.slice)?.[0] ?? ''}`);
    expect(
      bad,
      `Kieu tra ve cua handler phai co ten (vd UserView):\n${bad.join('\n')}`,
    ).toEqual([]);
  });

  it('10c — `@NoEnvelope()` chi duoc dung o danh sach trang', () => {
    /**
     * Mac dinh TU CHOI. Khong co luat nay thi `@NoEnvelope()` la duong thoat:
     * ai gap kho voi vo se gan no roi di tiep, va sau 20 module thi "vo chuan"
     * chi con la vo cua nhung endpoint khong gap kho.
     *
     * Them mot duong vao danh sach nay la mot quyet dinh CO Y THUC — dung y
     * muon cua luat.
     */
    const CHO_PHEP = new Set(['api/public/health.controller.ts']);
    const bad = FILES.filter((f) => /@NoEnvelope\s*\(/.test(f.code))
      .map((f) => f.path)
      .filter((p) => !CHO_PHEP.has(p) && !p.startsWith('shared/http/'));
    expect(bad, `@NoEnvelope() chua duoc duyet cho:\n${bad.join('\n')}`).toEqual([]);
  });
});

/**
 * Luat 11 — phan hoi dung MOT kieu viet: `snake_case`.
 *
 * `doc/06` viet `meta{page, page_size, total_items, total_pages}`; vo loi da
 * dung `request_id`; DTO dau vao dung `current_password`. Nhung thuc the
 * nghiep vu la `camelCase` (`lastLoginAt`), nen tra thang thuc the ra ngoai la
 * tron hai kieu viet trong CUNG mot phan hoi — va cai gia do frontend tra,
 * moi ngay, o moi truong.
 *
 * Cho chuyen doi la `api/dto/<x>.view.ts`, doi xung voi `dao/<bang>/mapper.ts`
 * o bien vao.
 */
describe('Luat 11 — kieu view cua API chi khai bao snake_case', () => {
  const VIEWS = FILES.filter((f) => /^api\/dto\/.*\.view\.ts$/.test(f.path));

  it('co file view de kiem', () => {
    expect(VIEWS.length).toBeGreaterThan(0);
  });

  it('khong truong nao viet camelCase', () => {
    const bad: string[] = [];
    for (const f of VIEWS) {
      for (const m of f.code.matchAll(/readonly\s+([A-Za-z_]\w*)\s*[?]?\s*:/g)) {
        const ten = m[1]!;
        if (/[A-Z]/.test(ten)) bad.push(`${f.path}: ${ten}`);
      }
    }
    expect(bad, `Truong cua phan hoi phai la snake_case:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('Bo quet hoat dong dung', () => {
  it('doc duoc file va tim thay import', () => {
    expect(FILES.length).toBeGreaterThan(10);
    expect(FILES.some((f) => f.imports.length > 0)).toBe(true);
  });
  it('nhan dien dung tang', () => {
    expect(layerOf('api/public/x.controller.ts')).toBe('api');
    expect(layerOf('dao/users/dao.ts')).toBe('dao');
    expect(layerOf('services/users/service.ts')).toBe('services');
  });
});
