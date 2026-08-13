#!/usr/bin/env python3
"""
Kiem tra du lieu san pham pilot truoc khi nap vao he thong.

Doi chieu 17 file .md voi rang buoc THAT cua schema:
  - Truong bat buoc de publish (publish.service.ts)
  - Enum compliance_type (admin-product.dto.ts)
  - Gioi han do dai truong (admin-product.dto.ts)
  - Taxonomy va tieu chuan da co trong he thong (seed-demo.ts)

Chay:  python doc/data/lab-products/tools/kiem_tra_du_lieu.py
Muc tieu sau khi chuan hoa xong: moi muc deu bao OK / khong con vi pham.
Xem doc/28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md PHAN 5 va PHAN 9.
"""
import io
import os
import re
import sys

# Console Windows mac dinh cp1252, khong in duoc tieng Viet -> ep UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FILES = [
    "herzog_hvm472.md", "herzog_hvp972.md", "herzog_optidist.md", "herzog_optiflash_merged.md",
    "isl_nck2_5g.md", "isl_opticpp.md", "isl_optifpp.md", "isl_optifzp.md",
    "isl_optimpp.md", "isl_optipmd.md",
    "phase_70xe_series.md", "phase_wat70xi.md", "phase_optimvd.md",
    "pac_optidist2.md", "pac_optifuel.md", "pac_optireader.md", "pac_zynthair.md",
]

# Trang thai he thong tai thoi diem 2026-08-11 (nguon: backend/scripts/seed-demo.ts).
# Cap nhat lai neu seed thay doi.
SEEDED_BRANDS = {"pac", "herzog", "isl", "anton-paar"}
SEEDED_CATEGORIES = {
    "petroleum-testing", "distillation", "atmospheric-distillation", "vacuum-distillation",
    "flash-point", "closed-cup", "open-cup", "vapor-pressure", "physical-properties",
    "density-meters", "viscometers", "cold-properties", "sample-preparation",
}
SEEDED_STANDARDS = {
    "ASTM D86", "ASTM D5191", "ASTM D93", "ASTM D4052", "ISO 3405", "ISO 2719", "IP 123",
    "ASTM D1078", "ASTM D850", "ASTM D92", "ASTM D445", "ASTM D2500", "ASTM D5771",
    "ASTM D97", "ASTM D5950", "ASTM D7346",
}

VALID_COMPLIANCE_TYPE = {"compliance", "correlation", "specification", "reference"}

# Gioi han do dai — nguon: backend/src/api/dto/admin-product.dto.ts
MAX_LEN = {"group_key": 100, "label": 500, "value": 2000, "unit": 100}

# Nhung thu KHONG phai phuong phap thu, khong duoc nam trong bang standards.
NOT_A_TEST_METHOD = {"CE", "CE MARKING", "ISO 9000"}


def doc_sections(text):
    out, cur, buf = {}, None, []
    for line in text.split("\n"):
        if line.startswith("## "):
            if cur:
                out[cur] = "\n".join(buf)
            cur, buf = line[3:].strip(), []
        else:
            buf.append(line)
    if cur:
        out[cur] = "\n".join(buf)
    return out


def table_rows(block):
    rows = []
    for line in block.split("\n"):
        line = line.strip()
        if not line.startswith("|"):
            continue
        if re.match(r"^\|[\s:|-]+\|$", line):
            continue
        rows.append([c.strip() for c in line.split("|")[1:-1]])
    return rows


def main():
    loi = []
    canh_bao = []
    tong_chuan = set()
    chuan_thieu = set()

    print("KIEM TRA DU LIEU SAN PHAM PILOT")
    print("=" * 60)
    print()

    print("[1] TRUONG BAT BUOC DE PUBLISH")
    print("    (name, slug, short_description, overview, featured_image,")
    print("     brand, >=1 category + dung 1 primary)")
    for f in FILES:
        path = os.path.join(DATA_DIR, f)
        if not os.path.exists(path):
            loi.append(f"Khong tim thay file {f}")
            continue
        t = io.open(path, encoding="utf-8").read()
        sec = doc_sections(t)
        keys = list(sec.keys())
        thieu = []
        if not re.search(r"(?i)^-?\s*slug\s*:", t, re.M):
            thieu.append("slug")
        if not re.search(r"(?i)seo[_ ]?title", t):
            thieu.append("seo_title")
        if not re.search(r"(?i)seo[_ ]?description", t):
            thieu.append("seo_description")
        if not any("categor" in k.lower() or "danh m" in k.lower() for k in keys):
            thieu.append("categories")
        if not any("industr" in k.lower() or "ngành" in k.lower() for k in keys):
            thieu.append("industries")
        # Chi xet DONG "- File:", khong quet ca muc — phan ghi chu thuong chua
        # cum "khong co chu/graphic overlay" hay trich dan "DO NOT USE", de gay
        # bao sai neu quet toan bo muc.
        anh = sec.get("Ảnh đại diện", "")
        # '[^:]*' de chap nhan ca 'File:', 'File chính:', 'File chính (đại diện chung):'
        dong_file = re.search(r"^\s*-\s*File[^:]*:\s*(.+)$", anh, re.M | re.I)
        if dong_file is None:
            thieu.append("featured_image")
        else:
            gia_tri = dong_file.group(1).strip().strip("`")
            co_duong_dan = bool(re.search(r"[A-Za-z]:\\|/|\\", gia_tri))
            if not co_duong_dan or re.match(r"(?i)^(không|khong)\s+có", gia_tri):
                thieu.append("featured_image")
        if thieu:
            loi.append(f"{f}: thieu {', '.join(thieu)}")
            print(f"    X {f:34s} thieu: {', '.join(thieu)}")
        else:
            print(f"    OK {f}")
    print()

    print("[2] ENUM compliance_type + BANG TIEU CHUAN")
    for f in FILES:
        path = os.path.join(DATA_DIR, f)
        if not os.path.exists(path):
            continue
        sec = doc_sections(io.open(path, encoding="utf-8").read())
        std_key = [k for k in sec if k.lower().startswith("standards")]
        if not std_key:
            canh_bao.append(f"{f}: KHONG co bang Standards -> khong loc duoc theo tieu chuan")
            print(f"    ! {f:34s} KHONG co bang Standards")
            continue
        rows = table_rows(sec[std_key[0]])
        if rows and "standard" in rows[0][0].lower():
            rows = rows[1:]
        for r in rows:
            if len(r) < 2:
                continue
            code = r[0].strip()
            ct = r[1].strip().lower().split("(")[0].strip()
            tong_chuan.add(code)
            if ct not in VALID_COMPLIANCE_TYPE:
                loi.append(f"{f}: compliance_type '{r[1][:40]}' khong hop le (chuan {code})")
                print(f"    X {f:28s} '{r[1][:34]}' <- enum khong hop le")
            # Luu y: dau '/' KHONG phai lúc nào cũng là dấu phân tách — 'GB/T 265'
            # và 'EN 13016/1' là MỘT mã chuẩn. Chỉ coi là gộp khi có khoảng
            # trắng quanh dấu '/' (vd 'ASTM D3828 / D3278').
            gop_nhieu_chuan = " / " in code
            if code.upper() in NOT_A_TEST_METHOD:
                loi.append(f"{f}: '{code}' khong phai phuong phap thu, khong duoc vao bang standards")
                print(f"    X {f:28s} '{code}' khong phai phuong phap thu")
            elif gop_nhieu_chuan:
                loi.append(f"{f}: '{code[:50]}' gop nhieu chuan trong 1 o, phai tach")
                print(f"    X {f:28s} gop nhieu chuan: '{code[:34]}'")
            elif not re.match(r"^(ASTM|ISO|EN|IP|DIN|JIS|GB|GOST|NF|CEC|SAE|DEF|CGSB|IS|NOM|Dto)", code, re.I):
                loi.append(f"{f}: '{code}' thieu ten to chuc")
                print(f"    X {f:28s} thieu to chuc: '{code}'")
            else:
                norm = re.sub(r"\s+", " ", re.sub(r"\s*\(.*?\)", "", code)).strip()
                if norm not in SEEDED_STANDARDS:
                    chuan_thieu.add(norm)
    print()

    print("[3] GIOI HAN DO DAI TRUONG SPECIFICATIONS")
    vi_pham_len = 0
    for f in FILES:
        path = os.path.join(DATA_DIR, f)
        if not os.path.exists(path):
            continue
        sec = doc_sections(io.open(path, encoding="utf-8").read())
        spec_key = [k for k in sec if k.lower().startswith("specifications")]
        if not spec_key:
            canh_bao.append(f"{f}: KHONG co muc Specifications -> trang san pham khong co thong so")
            print(f"    ! {f:34s} KHONG co muc Specifications")
            continue
        rows = table_rows(sec[spec_key[0]])
        if rows and rows[0][0].lower().startswith("group"):
            rows = rows[1:]
        if not rows:
            canh_bao.append(f"{f}: bang Specifications RONG -> trang san pham khong co thong so")
            print(f"    ! {f:34s} bang Specifications RONG")
            continue
        for r in rows:
            if len(r) < 4:
                continue
            for ten, gt in zip(("group_key", "label", "value", "unit"), r[:4]):
                if len(gt) > MAX_LEN[ten]:
                    vi_pham_len += 1
                    loi.append(f"{f}: {ten} dai {len(gt)} > {MAX_LEN[ten]}")
                    print(f"    X {f:28s} {ten} dai {len(gt)} ky tu")
    if vi_pham_len == 0:
        print("    OK khong co vi pham do dai")
    print()

    print("[4] GHI CHU NOI BO LAN VAO NOI DUNG CONG KHAI")
    mau = r"(?i)cần xác minh|chênh lệch|sai lệch|Technical Offer ghi|brochure ghi|ưu tiên bản"
    found = 0
    for f in FILES:
        path = os.path.join(DATA_DIR, f)
        if not os.path.exists(path):
            continue
        sec = doc_sections(io.open(path, encoding="utf-8").read())
        for k, v in sec.items():
            kl = k.lower()
            if kl.startswith(("operating conditions", "specifications", "overview", "features")):
                if re.search(mau, v):
                    found += 1
                    canh_bao.append(f"{f}: ghi chu noi bo trong muc '{k}'")
                    print(f"    ! {f:28s} muc '{k[:30]}'")
    if found == 0:
        print("    OK khong con ghi chu noi bo trong noi dung cong khai")
    print()

    print("[5] TIEU CHUAN CAN TAO MOI")
    print(f"    Tong so chuan rieng biet: {len(tong_chuan)}")
    print(f"    Da co trong he thong:     {len(SEEDED_STANDARDS)}")
    print(f"    CAN TAO MOI:              {len(chuan_thieu)}")
    print()

    print("=" * 60)
    print(f"LOI (chan nap du lieu):  {len(loi)}")
    print(f"CANH BAO (nen xu ly):    {len(canh_bao)}")
    print()
    if loi:
        print("=> CHUA DU DIEU KIEN NAP DU LIEU. Xem doc/28 PHAN 6.")
        return 1
    print("=> Da qua kiem tra co ban.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
