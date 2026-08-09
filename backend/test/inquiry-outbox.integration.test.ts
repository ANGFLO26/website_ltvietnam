import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { createTestClient, createTestPool } from '@ltv/testing';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

/**
 * D19 (idempotency) va FV-08 (outbox ben) — hai co che giu LEAD khong bi mat.
 *
 * Nguyen tac xuyen suot: tha gui trung email con hon mat mot yeu cau bao gia.
 */
run('Inquiry + outbox tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `iq-${Date.now()}`;
  let n = 0;
  const key = () => `${tag}-${++n}`;

  const base = (k: string) => ({
    inquiryType: 'quotation' as const,
    fullName: 'Nguyen Van A',
    message: 'Xin bao gia may OptiDist',
    idempotencyKey: k,
    privacyConsentAt: new Date(),
    email: 'a@example.com',
  });

  beforeAll(async () => {
    pool = createTestPool(url);
    daos = createDaoManager(createKysely(pool));
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.inquiry_outbox WHERE recipient = $1`, [
      `reset-${tag}@example.com`,
    ]);
    await pool.query(`DELETE FROM ltv.inquiries WHERE idempotency_key LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  // ══════════════════ D19 — idempotency ══════════════════

  it('lan dau tao moi, lan hai TRA LAI ban cu chu khong tao them', async () => {
    const k = key();
    const first = await daos.inquiries.createIdempotent(base(k));
    const second = await daos.inquiries.createIdempotent(base(k));

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.inquiry.id).toBe(first.inquiry.id);
  });

  it('lan hai KHONG ghi de noi dung cu', async () => {
    const k = key();
    const first = await daos.inquiries.createIdempotent(base(k));
    // Khach bam lai sau khi sua o "message" — day KHONG phai mot ban sua,
    // ma la mot lan bam nut lap. Noi dung cu phai duoc giu.
    const second = await daos.inquiries.createIdempotent({
      ...base(k),
      message: 'NOI DUNG KHAC HAN',
      fullName: 'Ten khac',
    });
    expect(second.inquiry.message).toBe(first.inquiry.message);
    expect(second.inquiry.fullName).toBe('Nguyen Van A');
  });

  it('HAI YEU CAU CUNG LUC cung mot khoa — dung mot ban ghi, khong ai nhan loi', async () => {
    /**
     * Day la ca ma "kiem truoc roi ghi" that bai: hai tien trinh cung thay
     * "chua co", ca hai cung ghi, mot cai do vi trung khoa — va khach nhan
     * loi 500 cho mot thao tac le ra thanh cong.
     *
     * `ON CONFLICT DO NOTHING` + doc lai khien ca hai deu thanh cong.
     */
    const k = key();
    const [a, b] = await Promise.all([
      daos.inquiries.createIdempotent(base(k)),
      daos.inquiries.createIdempotent(base(k)),
    ]);

    expect(a.inquiry.id).toBe(b.inquiry.id);
    // Dung mot cai tao moi, mot cai la replay
    expect([a.replayed, b.replayed].sort()).toEqual([false, true]);

    const r = await pool.query(
      `SELECT count(*) AS n FROM ltv.inquiries WHERE idempotency_key = $1`,
      [k],
    );
    expect(Number(r.rows[0].n)).toBe(1);
  });

  it('DB tu choi yeu cau khong co ca dien thoai lan email', async () => {
    await expect(
      daos.inquiries.createIdempotent({ ...base(key()), email: null, phone: null }),
    ).rejects.toThrow();
    // Chi co dien thoai thi duoc — nhieu khach cong nghiep chi de lai so
    await expect(
      daos.inquiries.createIdempotent({ ...base(key()), email: null, phone: '0900000000' }),
    ).resolves.toBeTruthy();
  });

  it('du lieu chong lam dung KHONG lot vao thuc the nghiep vu', async () => {
    const r = await daos.inquiries.createIdempotent({
      ...base(key()),
      ipAddress: '203.0.113.9',
      userAgent: 'Mozilla/5.0',
      captchaScore: 0.9,
    });
    // Ba truong nay co trong bang nhung khong co trong `Inquiry` — de chung
    // khong the lot vao response API mot cach vo y.
    expect('ipAddress' in r.inquiry).toBe(false);
    expect('userAgent' in r.inquiry).toBe(false);
    expect('captchaScore' in r.inquiry).toBe(false);
  });

  it('mac dinh KHONG dat han luu tru (ADR-003: doanh nghiep chua chot)', async () => {
    const r = await daos.inquiries.createIdempotent(base(key()));
    expect(r.inquiry.expiresAt).toBeNull();
    expect(r.inquiry.emailStatus).toBe('email_pending');
  });

  // ══════════════════ inquiry + outbox trong MOT transaction ══════════════════

  it('ROLLBACK: yeu cau va job cung song cung chet', async () => {
    const k = key();
    await expect(
      daos.transaction(async (tx) => {
        const r = await tx.inquiries.createIdempotent(base(k));
        await tx.inquiries.enqueueEmail({ inquiryId: r.inquiry.id, recipient: 'sales@ltv.vn' });
        throw new Error('buoc sau that bai');
      }),
    ).rejects.toThrow('buoc sau that bai');

    // Commit inquiry ma khong commit job thi lead nam im mai mai —
    // nen ca hai phai cung bi hoan tac.
    expect(await daos.inquiries.findByIdempotencyKey(k)).toBeNull();
  });

  it('COMMIT: ca hai cung duoc ghi', async () => {
    const k = key();
    const id = await daos.transaction(async (tx) => {
      const r = await tx.inquiries.createIdempotent(base(k));
      await tx.inquiries.enqueueEmail({ inquiryId: r.inquiry.id, recipient: 'sales@ltv.vn' });
      return r.inquiry.id;
    });
    expect(await daos.inquiries.findById(id)).not.toBeNull();
    expect(await daos.inquiries.findJobsByInquiry(id)).toHaveLength(1);
  });

  it('job trung bi bo qua, khong nem loi (de replay goi lai duoc)', async () => {
    const r = await daos.inquiries.createIdempotent(base(key()));
    const first = await daos.inquiries.enqueueEmail({
      inquiryId: r.inquiry.id,
      recipient: 'sales@ltv.vn',
    });
    const again = await daos.inquiries.enqueueEmail({
      inquiryId: r.inquiry.id,
      recipient: 'sales@ltv.vn',
    });
    expect(first).not.toBeNull();
    expect(again).toBeNull();
    expect(await daos.inquiries.findJobsByInquiry(r.inquiry.id)).toHaveLength(1);

    // Nguoi nhan khac thi la job khac — cho phep gui nhieu noi
    await daos.inquiries.enqueueEmail({ inquiryId: r.inquiry.id, recipient: 'ky-thuat@ltv.vn' });
    expect(await daos.inquiries.findJobsByInquiry(r.inquiry.id)).toHaveLength(2);
  });

  it('reset mat khau dung chung outbox ma khong tao inquiry gia', async () => {
    const job = await daos.inquiries.enqueuePasswordReset({
      recipient: `reset-${tag}@example.com`,
      token: 'signed-reset-token',
    });
    expect(job.inquiryId).toBeNull();
    expect(job.notificationType).toBe('password_reset');
    expect(job.payload).toEqual({ token: 'signed-reset-token' });
  });

  // ══════════════════ FV-08 — lay job dong thoi ══════════════════

  const seedJobs = async (count: number, prefix: string) => {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const r = await daos.inquiries.createIdempotent(base(key()));
      const job = await daos.inquiries.enqueueEmail({
        inquiryId: r.inquiry.id,
        recipient: `${prefix}-${i}@ltv.vn`,
      });
      ids.push(job!.id);
    }
    return ids;
  };

  it('HAI WORKER CUNG LUC lay duoc HAI TAP RIENG BIET, khong chong nhau', async () => {
    /**
     * Day la bai kiem quan trong nhat cua ca D6.
     *
     * Phai dung HAI KET NOI THAT, khong phai hai loi goi tuan tu tren cung
     * mot ket noi: `FOR UPDATE SKIP LOCKED` chi co y nghia khi co hai
     * transaction song song thuc su. Chay tuan tu thi cau lenh nao cung
     * thanh cong, va bai kiem se PASS ngay ca khi da bo `SKIP LOCKED`.
     */
    const jobIds = await seedJobs(10, 'race');

    const poolA = createTestPool(url, { max: 1 });
    const poolB = createTestPool(url, { max: 1 });
    try {
      const a = createDaoManager(createKysely(poolA));
      const b = createDaoManager(createKysely(poolB));
      const now = new Date();

      const [gotA, gotB] = await Promise.all([
        a.inquiries.claimJobs('worker-A', 10, now),
        b.inquiries.claimJobs('worker-B', 10, now),
      ]);

      const idsA = new Set(gotA.map((j) => j.id));
      const idsB = new Set(gotB.map((j) => j.id));
      const chung = [...idsA].filter((x) => idsB.has(x));

      // KHONG job nao thuoc ca hai worker
      expect(chung, `job bi lay boi ca hai worker: ${chung.join(', ')}`).toEqual([]);

      // Va ca hai cong lai phai phu het — khong job nao bi bo roi
      const ourJobs = jobIds.filter((id) => idsA.has(id) || idsB.has(id));
      expect(ourJobs).toHaveLength(jobIds.length);

      // Moi job lay ve deu da duoc DANH DAU giu, khong chi doc suong
      for (const j of [...gotA, ...gotB]) {
        expect(j.status).toBe('processing');
        expect(j.lockedBy).toMatch(/^worker-[AB]$/);
        expect(j.lockedAt).not.toBeNull();
      }
    } finally {
      await poolA.end();
      await poolB.end();
    }
  });

  it('SKIP LOCKED — worker khong DUNG CHO nhau, chi bo qua job dang bi giu', async () => {
    /**
     * Vi sao can bai kiem RIENG nay:
     *
     * Bai kiem "hai worker lay hai tap rieng biet" o tren van PASS khi toi
     * co y doi `SKIP LOCKED` thanh `FOR UPDATE` tran. Ly do: `FOR UPDATE`
     * cung ngan lay trung — worker B chi DUNG CHO worker A xong roi doc lai
     * va thay job da doi trang thai. Dung, nhung cham.
     *
     * Tinh chat that su can chung minh la KHONG CHAN. Neu mat no thi mot
     * worker cham (SMTP treo 30 giay) se lam ca hang doi dung lai, va do la
     * kieu hong chi lo ra khi co tai — dung luc khong ai muon no lo ra.
     *
     * Cach do: mo mot transaction giu khoa mot job, roi goi `claimJobs` tren
     * ket noi khac voi `statement_timeout` ngan. Co SKIP LOCKED thi tra ve
     * ngay; khong co thi cham tran thoi gian.
     */
    const [heldId] = await seedJobs(1, 'lock');

    const holder = createTestClient(url);
    // Tran NGAN la cach bai kiem nay chung minh dieu no noi: co SKIP LOCKED thi
    // tra ve ngay, khong co thi cham tran.
    const worker = createTestPool(url, { max: 1, statementTimeoutMs: 1500 });

    await holder.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT id FROM ltv.inquiry_outbox WHERE id = $1 FOR UPDATE', [heldId]);

      const w = createDaoManager(createKysely(worker));
      const batDau = Date.now();
      // Khong duoc nem loi vi cham tran thoi gian, va phai tra ve nhanh
      const got = await w.inquiries.claimJobs('worker-nhanh', 100, new Date());
      const mat = Date.now() - batDau;

      expect(mat, `cho ${mat}ms — worker dang bi chan`).toBeLessThan(1000);
      expect(
        got.map((j) => j.id),
        'job dang bi giu phai bi BO QUA',
      ).not.toContain(heldId);
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      await holder.end();
      await worker.end();
    }
  });

  it('lay lan hai khong lay lai job da `processing`', async () => {
    const ids = await seedJobs(3, 'twice');
    const now = new Date();
    const lan1 = await daos.inquiries.claimJobs('w1', 100, now);
    expect(lan1.map((j) => j.id)).toEqual(expect.arrayContaining(ids));

    const lan2 = await daos.inquiries.claimJobs('w2', 100, now);
    const trung = lan2.filter((j) => ids.includes(j.id));
    expect(trung).toEqual([]);
  });

  it('job hen gio tuong lai chua den luot', async () => {
    const [id] = await seedJobs(1, 'future');
    const mai = new Date(Date.now() + 86_400_000);
    await daos.inquiries.markJobFailed(id!, new Date(), 'SMTP timeout', mai);

    const bayGio = await daos.inquiries.claimJobs('w', 100, new Date());
    expect(bayGio.map((j) => j.id)).not.toContain(id);

    // Toi gio thi lay duoc
    const sauDo = await daos.inquiries.claimJobs('w', 100, new Date(Date.now() + 90_000_000));
    expect(sauDo.map((j) => j.id)).toContain(id);
  });

  it('that bai con retry: tang attempts, ve `pending`, nha khoa', async () => {
    const [id] = await seedJobs(1, 'retry');
    await daos.inquiries.claimJobs('w', 100, new Date());

    const sau = new Date(Date.now() + 60_000);
    await daos.inquiries.markJobFailed(id!, new Date(), 'SMTP 421 timeout', sau);

    const jobs = await daos.inquiries.findJobsByInquiry(
      (await daos.inquiries.findById(
        (await pool.query(`SELECT inquiry_id FROM ltv.inquiry_outbox WHERE id = $1`, [id])).rows[0]
          .inquiry_id,
      ))!.id,
    );
    const j = jobs.find((x) => x.id === id)!;
    expect(j.status).toBe('pending');
    expect(j.attempts).toBe(1);
    expect(j.lockedAt).toBeNull();
    expect(j.lockedBy).toBeNull();
    expect(j.lastError).toBe('SMTP 421 timeout');
  });

  it('het luot thu: chuyen `failed`, KHONG xoa yeu cau', async () => {
    const k = key();
    const r = await daos.inquiries.createIdempotent(base(k));
    const job = await daos.inquiries.enqueueEmail({
      inquiryId: r.inquiry.id,
      recipient: 'het-luot@ltv.vn',
    });
    await daos.inquiries.claimJobs('w', 100, new Date());
    // `nextAttemptAt = null` = het luot
    await daos.inquiries.markJobFailed(job!.id, new Date(), 'SMTP 550', null);
    await daos.inquiries.setEmailStatus(r.inquiry.id, 'email_failed');

    const after = (await daos.inquiries.findJobsByInquiry(r.inquiry.id)).find(
      (x) => x.id === job!.id,
    )!;
    expect(after.status).toBe('failed');

    // Gui email that bai KHONG duoc lam mat lead — nhan vien van lien he tay duoc
    const inq = await daos.inquiries.findById(r.inquiry.id);
    expect(inq).not.toBeNull();
    expect(inq!.emailStatus).toBe('email_failed');
    expect(inq!.email).toBe('a@example.com');
  });

  it('gui thanh cong: `sent`, nha khoa, xoa loi cu', async () => {
    const k = key();
    const r = await daos.inquiries.createIdempotent(base(k));
    const job = await daos.inquiries.enqueueEmail({
      inquiryId: r.inquiry.id,
      recipient: 'ok@ltv.vn',
    });
    await daos.inquiries.claimJobs('w', 100, new Date());
    await daos.inquiries.markJobFailed(job!.id, new Date(), 'loi tam thoi', new Date());
    await daos.inquiries.claimJobs('w', 100, new Date(Date.now() + 1000));
    await daos.inquiries.markJobSent(job!.id, new Date());
    await daos.inquiries.setEmailStatus(r.inquiry.id, 'email_sent');

    const after = (await daos.inquiries.findJobsByInquiry(r.inquiry.id))[0]!;
    expect(after.status).toBe('sent');
    expect(after.sentAt).not.toBeNull();
    expect(after.lockedBy).toBeNull();
    expect(after.lastError).toBeNull();
  });

  // ══════════════════ reaper ══════════════════

  it('REAPER dua job ket o `processing` ve `pending`', async () => {
    const [id] = await seedJobs(1, 'stale');
    // Worker lay job roi CHET truoc khi ghi ket qua
    await daos.inquiries.claimJobs('worker-chet', 100, new Date());

    // Chua qua han thi khong dung toi — worker co the con dang song
    const chuaQuaHan = await daos.inquiries.reapStaleJobs(
      new Date(Date.now() - 3_600_000),
      new Date(),
    );
    void chuaQuaHan;
    let j = (await daos.inquiries.claimJobs('w2', 100, new Date())).find((x) => x.id === id);
    expect(j, 'job dang bi giu khong duoc lay lai').toBeUndefined();

    // Qua han thi thu ve
    const soLuong = await daos.inquiries.reapStaleJobs(new Date(Date.now() + 1000), new Date());
    expect(soLuong).toBeGreaterThanOrEqual(1);

    j = (await daos.inquiries.claimJobs('w3', 100, new Date())).find((x) => x.id === id);
    expect(j, 'sau khi reap thi worker khac phai lay duoc').toBeDefined();
    expect(j!.lockedBy).toBe('w3');
  });

  it('reaper KHONG dung toi job da `sent`', async () => {
    const k = key();
    const r = await daos.inquiries.createIdempotent(base(k));
    const job = await daos.inquiries.enqueueEmail({
      inquiryId: r.inquiry.id,
      recipient: 'da-gui@ltv.vn',
    });
    await daos.inquiries.claimJobs('w', 100, new Date());
    await daos.inquiries.markJobSent(job!.id, new Date());

    await daos.inquiries.reapStaleJobs(new Date(Date.now() + 1000), new Date());
    const after = (await daos.inquiries.findJobsByInquiry(r.inquiry.id))[0]!;
    expect(after.status).toBe('sent');
  });

  it('dem theo trang thai — dung cho canh bao van hanh', async () => {
    const counts = await daos.inquiries.countJobsByStatus();
    expect(Object.keys(counts).length).toBeGreaterThan(0);
    for (const v of Object.values(counts)) expect(typeof v).toBe('number');
  });
});
