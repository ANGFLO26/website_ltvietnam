#!/usr/bin/env python3
"""
Chuan hoa 17 file .md thanh du lieu co cau truc de nap vao he thong.

Dau ra:
  du-lieu-chuan-hoa.json   -> du lieu san sang nap (seed-lab-products.ts doc file nay)
  ../../29_DIEM_CAN_XAC_MINH_VOI_HANG.md -> ghi chu noi bo tach ra khoi noi dung cong khai

Viec script nay lam (doc/28 PHAN 6):
  - Bo sung slug / seo_title / seo_description
  - Gan categories (dung 1 primary) / applications / industries
  - Tach cac o tieu chuan bi gop, bo sung to chuc, loai muc khong phai phuong phap thu
  - TACH ghi chu noi bo ra khoi noi dung cong khai
  - Chuyen bang Specifications sang dang co cau truc

Chay:  python doc/data/lab-products/tools/chuan_hoa.py
"""
import io
import json
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC_DIR = os.path.dirname(os.path.dirname(DATA_DIR))

# ─────────────────────────────────────────────────────────────
# ANH XA THU CONG — cac quyet dinh nghiep vu, khong suy ra tu file .md duoc.
# categories[0] LA DANH MUC CHINH (ADR-010).
# ─────────────────────────────────────────────────────────────
ANH_XA = {
    "herzog_hvm472.md": dict(
        slug="herzog-hvm-472-multi-range-viscometer", brand="herzog",
        categories=["viscometers", "physical-properties"],
        applications=["lubricant-analysis", "diesel"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "herzog_hvp972.md": dict(
        slug="herzog-hvp-972-vapor-pressure-analyzer", brand="herzog",
        categories=["vapor-pressure", "physical-properties"],
        applications=["gasoline", "crude-oil-assay"],
        industries=["oil-and-gas", "petrochemical"],
    ),
    "herzog_optidist.md": dict(
        slug="herzog-optidist-atmospheric-distillation-analyzer", brand="herzog",
        categories=["atmospheric-distillation", "distillation"],
        applications=["gasoline", "diesel", "jet-fuel"],
        industries=["oil-and-gas", "petrochemical"],
    ),
    "herzog_optiflash_merged.md": dict(
        slug="herzog-optiflash-flash-point-tester", brand="herzog",
        categories=["flash-point", "closed-cup", "open-cup"],
        applications=["diesel", "lubricant-analysis"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "isl_nck2_5g.md": dict(
        slug="isl-nck2-5g-noack-volatility-tester", brand="isl",
        categories=["volatility", "physical-properties"],
        applications=["lubricant-analysis"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "isl_opticpp.md": dict(
        slug="isl-opticpp-cloud-and-pour-point-analyzer", brand="isl",
        categories=["cold-properties"],
        applications=["diesel", "lubricant-analysis"],
        industries=["oil-and-gas"],
    ),
    "isl_optifpp.md": dict(
        slug="isl-optifpp-cold-filter-plugging-point-analyzer", brand="isl",
        categories=["cold-properties"],
        applications=["diesel"],
        industries=["oil-and-gas"],
    ),
    "isl_optifzp.md": dict(
        slug="isl-optifzp-freezing-point-analyzer", brand="isl",
        categories=["cold-properties"],
        applications=["jet-fuel"],
        industries=["oil-and-gas"],
    ),
    "isl_optimpp.md": dict(
        slug="isl-optimpp-mini-cloud-and-pour-point-analyzer", brand="isl",
        categories=["cold-properties"],
        applications=["lubricant-analysis", "diesel"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "isl_optipmd.md": dict(
        slug="isl-optipmd-micro-distillation-analyzer", brand="isl",
        categories=["distillation", "atmospheric-distillation"],
        applications=["gasoline", "diesel", "jet-fuel"],
        industries=["oil-and-gas"],
    ),
    "phase_70xe_series.md": dict(
        slug="phase-technology-70xe-series-analyzer", brand="phase-technology",
        categories=["cold-properties", "viscometers", "density-meters"],
        applications=["jet-fuel", "diesel"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "phase_wat70xi.md": dict(
        slug="phase-technology-wat-70xi-crude-oil-analyzer", brand="phase-technology",
        categories=["cold-properties"],
        applications=["crude-oil-assay"],
        industries=["oil-and-gas"],
    ),
    "phase_optimvd.md": dict(
        slug="phase-technology-optimvd-viscometer-density-analyzer", brand="phase-technology",
        categories=["viscometers", "density-meters"],
        applications=["diesel", "lubricant-analysis"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "pac_optidist2.md": dict(
        slug="pac-optidist-2-atmospheric-distillation-analyzer", brand="pac",
        categories=["atmospheric-distillation", "distillation"],
        applications=["gasoline", "diesel", "jet-fuel"],
        industries=["oil-and-gas", "petrochemical"],
    ),
    "pac_optifuel.md": dict(
        slug="pac-optifuel-ftir-fuel-analyzer", brand="pac",
        categories=["spectroscopy", "physical-properties"],
        applications=["gasoline", "diesel", "jet-fuel"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "pac_optireader.md": dict(
        slug="pac-optireader-jftot-heater-tube-scanner", brand="pac",
        categories=["thermal-oxidation-stability"],
        applications=["jet-fuel"],
        industries=["oil-and-gas", "quality-control-lab"],
    ),
    "pac_zynthair.md": dict(
        slug="pac-zynthair-gas-mixer", brand="pac",
        categories=["lab-accessories"],
        applications=["diesel"],
        industries=["oil-and-gas"],
        product_type="accessory",
    ),
}

# Danh muc CAN TAO MOI (chua co trong he thong). parent=None -> goc.
DANH_MUC_MOI = [
    dict(slug="volatility", name="Volatility", parent="physical-properties"),
    dict(slug="spectroscopy", name="Spectroscopy", parent="petroleum-testing"),
    dict(slug="thermal-oxidation-stability", name="Thermal Oxidation Stability",
         parent="petroleum-testing"),
    dict(slug="lab-accessories", name="Laboratory Accessories", parent=None),
]

BRAND_MOI = [dict(slug="phase-technology", name="Phase Technology", code="PT", country="CA")]

# ─────────────────────────────────────────────────────────────
# TACH GHI CHU NOI BO
# ─────────────────────────────────────────────────────────────
# Dau hieu mot doan la ghi chu cho nguoi RA SOAT, khong phai noi dung cho KHACH.
# Bat ky nhac den TEN TAI LIEU NGUON deu la ghi chu noi bo: khach mua may khong
# quan tam so lieu nay nam o brochure hay o technical offer.
#
# CANH BAO khi sua bieu thuc nay: phai NEO vao ngu canh dan nguon.
# Tung co lan dung mot minh tu 'nguồn' -> no khop ca 'nguồn sáng laser' trong
# mo ta nguyen ly cua OptiFZP va xoa mat doan noi dung ky thuat that.
# Moi tu them vao phai la tu CHI XUAT HIEN khi noi ve tai lieu nguon.
#
DAU_HIEU_GHI_CHU = re.compile(
    r"(?i)(brochure|technical offer|datasheet|"
    r"tài liệu nguồn|(cả |giữa |theo |hai |2 )nguồn|nguồn nào|"
    r"cần xác minh|xác minh lại|chênh lệch|sai lệch|lệch (giữa|nhau|nhỏ)|"
    r"ưu tiên (bản|số liệu|nguồn|theo|dùng|cho)|"
    r"(bản|phiên bản|tài liệu|số liệu) mới (nhất|hơn)|"
    r"không nhất quán|có thể là lỗi|nghi ngờ lỗi|lỗi đánh máy|"
    r"cần convert|cần bổ sung|cần yêu cầu|nên xin|cần xin|đã ghi chú|xem ghi chú|"
    r"nêu (trong|bổ sung|rõ trong)|xuất hiện trong|liệt kê (trong|riêng)|"
    r"không phải web-ready|trang \d+|rev\.?\s*\d|20\d\d[\.\-]\d)"
)

# Cum dan nguon dang ngoac can go bo, du phan con lai van dung duoc.
DAN_NGUON = re.compile(
    r"(?i)\s*[\[\(][^\[\]\(\)]*(technical offer|brochure|datasheet|mới nhất|bản mới|"
    r"rev\.?\s*\d|20\d\d[\.\-]\d|nguồn)[^\[\]\(\)]*[\]\)]"
)

# Menh de dan nguon di kem o cuoi cau, vd ', nêu trong cả 2 nguồn'.
MENH_DE_DAN_NGUON = re.compile(
    r"(?i)[,;—]\s*(nêu|ghi|xuất hiện|liệt kê|chỉ (có|nêu|xuất hiện)|theo)\s+"
    r"(trong|ở|tại|cả|brochure|technical offer|datasheet|bản|mục|bảng)\b.*$"
)


def _don_dep(ra):
    ra = re.sub(r"\s{2,}", " ", ra).strip(" ;,")
    # Con sot dau mo ngoac khong dong do cat giua chung
    if ra.count("(") > ra.count(")"):
        ra = re.sub(r"\s*\([^)]*$", "", ra)
    return ra.strip(" ;,")


def lam_sach(text):
    """
    Cho GACH DAU DONG va O BANG — chuoi ngan, nhieu ve ngan cach bang '—' hoac ';'.
    Cat bo cac ve la ghi chu noi bo, giu cac ve con lai.
    """
    if not text:
        return ""
    text = DAN_NGUON.sub("", text)
    text = MENH_DE_DAN_NGUON.sub("", text)
    ve = re.split(r"\s+—\s+|;\s+", text)
    giu = [v for v in ve if v.strip() and not DAU_HIEU_GHI_CHU.search(v)]
    if not giu:
        return ""
    return _don_dep("; ".join(v.strip() for v in giu))


def lam_sach_van_xuoi(text):
    """
    Cho DOAN VAN (overview, principle) — KHONG duoc cat theo ';'.
    Van ky thuat dung ';' de noi menh de trong cung mot y; cat theo no da tung
    lam mat nguyen doan mo ta nguyen ly quang hoc cua OptiFZP.
    Chi go trich dan nguon, va chi bo NGUYEN CAU khi ca cau la ghi chu.
    """
    if not text:
        return ""
    text = DAN_NGUON.sub("", text)
    text = MENH_DE_DAN_NGUON.sub("", text)
    cau = re.split(r"(?<=[.!?])\s+", text)
    giu = [c for c in cau if c.strip() and not DAU_HIEU_GHI_CHU.search(c)]
    if not giu:
        return ""
    return _don_dep(" ".join(c.strip() for c in giu))


def la_ghi_chu(text):
    return bool(DAU_HIEU_GHI_CHU.search(text))


# ─────────────────────────────────────────────────────────────
# PHAN TICH FILE .md
# ─────────────────────────────────────────────────────────────
def cac_muc(text):
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


def tim_muc(secs, *tien_to):
    for k in secs:
        kl = k.lower()
        for t in tien_to:
            if kl.startswith(t.lower()):
                return secs[k]
    return ""


def gach_dau(block, lam_sach_noi_dung=True):
    ra = []
    for line in block.split("\n"):
        line = line.strip()
        if not line.startswith("- "):
            continue
        noi_dung = line[2:].strip()
        noi_dung = re.sub(r"\*\*(.+?)\*\*", r"\1", noi_dung)
        if lam_sach_noi_dung:
            if la_ghi_chu(noi_dung):
                noi_dung = lam_sach(noi_dung)
            if not noi_dung:
                continue
        ra.append(noi_dung)
    return ra


def doan_van(block):
    """Lay cac doan van (bo dong bat dau bang '-', '|', '*Ghi chu')."""
    ra = []
    for para in re.split(r"\n\s*\n", block):
        para = para.strip()
        if not para or para.startswith(("-", "|", "*", "#", ">")):
            continue
        para = re.sub(r"\*\*(.+?)\*\*", r"\1", para)
        para = re.sub(r"\s*\n\s*", " ", para)
        para = lam_sach_van_xuoi(para)
        if para:
            ra.append(para)
    return ra


def bang(block):
    rows = []
    for line in block.split("\n"):
        line = line.strip()
        if not line.startswith("|"):
            continue
        if re.match(r"^\|[\s:|-]+\|$", line):
            continue
        rows.append([c.strip() for c in line.split("|")[1:-1]])
    return rows


# ─────────────────────────────────────────────────────────────
# CHUAN HOA TIEU CHUAN
# ─────────────────────────────────────────────────────────────
KHONG_PHAI_PHUONG_PHAP = {"CE", "CE MARKING", "ISO 9000", "EC CONFORMITY"}
TO_CHUC = r"(ASTM|EN ISO|ISO|EN|IP|DIN EN ISO|DIN|JIS|GB/T|GB|GOST R|GOST|NF|CEC|SAE|DEF STAN|CGSB|IS|NOM|CEN)"
CT_HOP_LE = {"compliance", "correlation", "specification", "reference"}


def chuan_hoa_code(org, phan_con_lai):
    """
    Lay dung MA chuan, bo mo ta di kem.
      'D 6371'              -> 'D6371'
      'D3241-18 Annex A4'   -> 'D3241'
      'D86 (Groups 1-4)'    -> 'D86'
      'K 2265'              -> 'K2265'
      '71 Section 1'        -> '71'
    """
    s = re.sub(r"\s*\([^)]*\)", "", phan_con_lai).strip()
    # Bo mo ta duoi duoi dang 'Annex A4', 'Section 1', 'Groups 1-4', 'Procedure B'...
    s = re.sub(r"(?i)\s+(annex|section|group|groups|procedure|methods?|part|rev\.?)\b.*$", "", s)
    o = org.upper()
    if o.startswith("ASTM"):
        m = re.match(r"^D\s*(\d+)\s*([A-Z])?\b", s, re.I)
        if m:
            return f"D{m.group(1)}{(m.group(2) or '').upper()}"
    if o.startswith("JIS"):
        m = re.match(r"^K\s*(\d+)", s, re.I)
        if m:
            return f"K{m.group(1)}"
    if o.startswith("CEC"):
        m = re.match(r"^(L-\d+-\d+)", s, re.I)
        if m:
            return m.group(1)
    # Mac dinh: cum ky tu dinh danh dau tien (so, co the kem dau -, ., /, :)
    m = re.match(r"^([A-Z]?\s*[\d][\d\.\-/:]*)", s, re.I)
    if m:
        return re.sub(r"\s+", "", m.group(1)).rstrip(".-/:")
    return s.split()[0] if s.split() else s


def tach_ma_chuan(o):
    """'ASTM D92 / ISO 2592 / IP 36' -> [('ASTM','D92'),('ISO','2592'),('IP','36')]"""
    o = re.sub(r"\*\*", "", o).strip()

    # B1. Tach cac chuan TUONG DUONG nam trong ngoac TRUOC khi cat theo ' / ',
    #     neu khong 'ASTM D2500 (IP 219 / ISO 3015)' se bi cat sai thanh
    #     'ASTM D2500 (IP 219' va 'ISO 3015)'.
    ung_vien = []
    for noi_dung in re.findall(r"\(([^)]*)\)", o):
        if re.search(rf"^{TO_CHUC}\s", noi_dung.strip(), re.I):
            ung_vien += [x.strip() for x in re.split(r"\s*/\s*", noi_dung)]
    chinh = re.sub(r"\s*\([^)]*\)", " ", o)
    # Cat ca theo dau phay: 'ASTM D5972, D5773, D7777' — cac ma sau ke thua to
    # chuc cua ma dau. (Phan mo ta trong ngoac da bi go o tren nen dau phay con
    # lai chi la dau ngan cach giua cac ma chuan.)
    ung_vien = [x.strip() for x in re.split(r"\s+/\s+|\s+·\s+|\s*,\s*", chinh)] + ung_vien

    ra = []
    to_chuc_gan_nhat = None
    for p in ung_vien:
        p = p.strip().strip(",")
        if not p or p.upper() in KHONG_PHAI_PHUONG_PHAP:
            continue
        m = re.match(rf"^{TO_CHUC}\s+(.+)$", p, re.I)
        if m:
            org = m.group(1).upper()
            to_chuc_gan_nhat = org
            code = chuan_hoa_code(org, m.group(2))
            if code:
                ra.append((org, code))
        elif re.match(r"^[A-Z]?\d", p) and to_chuc_gan_nhat:
            # 'ASTM D4737 / D976' -> D976 ke thua to chuc ASTM
            code = chuan_hoa_code(to_chuc_gan_nhat, p)
            if code:
                ra.append((to_chuc_gan_nhat, code))
    # Khu trung trong cung mot o
    thay = set()
    duy_nhat = []
    for org, code in ra:
        if (org, code) not in thay:
            thay.add((org, code))
            duy_nhat.append((org, code))
    return duy_nhat


def chuan_hoa_ct(gia_tri):
    g = gia_tri.strip().lower()
    g = re.sub(r"\s*\(.*", "", g).strip()
    if g in CT_HOP_LE:
        return g
    if g.startswith("compliant"):
        return "compliance"
    if g.startswith("correlat"):
        return "correlation"
    if "/" in g:  # 'compliance/correlation' -> chon ve chat hon
        return "correlation"
    return "reference"


# Cung mot chuan nhung nguon viet khac nhau -> gop ve mot dang.
BI_DANH = {("DEF STAN", "91-91"): ("DEF STAN", "91-091")}


def slug_chuan(org, code):
    s = f"{org} {code}".lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


# ─────────────────────────────────────────────────────────────
def main():
    san_pham = []
    ghi_chu_tach_ra = []
    tat_ca_chuan = {}

    for ten_file, anh_xa in ANH_XA.items():
        path = os.path.join(DATA_DIR, ten_file)
        raw = io.open(path, encoding="utf-8").read()
        secs = cac_muc(raw)

        tieu_de = raw.split("\n")[0].lstrip("# ").strip()
        chung = tim_muc(secs, "Thông tin chung")
        model = ""
        short = ""
        product_type = anh_xa.get("product_type", "equipment")
        for line in chung.split("\n"):
            line = line.strip()
            if re.match(r"(?i)^-\s*model\s*:", line):
                model = re.sub(r"(?i)^-\s*model\s*:", "", line).strip()
                model = re.sub(r"\s*\(.*", "", model).strip()
            if re.match(r"(?i)^-\s*short description\s*:", line):
                short = re.sub(r"(?i)^-\s*short description\s*:", "", line).strip()

        short = lam_sach(short) if la_ghi_chu(short) else short
        short = re.sub(r"\*\*", "", short)[:2000]

        ten = tieu_de.split("—")[0].strip()

        # Noi dung
        overview = doan_van(tim_muc(secs, "Overview"))
        features = gach_dau(tim_muc(secs, "Features"))
        applications = gach_dau(tim_muc(secs, "Applications"))
        principle = doan_van(tim_muc(secs, "Principle"))
        sample_types = gach_dau(tim_muc(secs, "Sample types"))
        operating = gach_dau(tim_muc(secs, "Operating conditions"))
        accessories = gach_dau(tim_muc(secs, "Accessories"))

        # Specifications
        specs = []
        for r in bang(tim_muc(secs, "Specifications")):
            if len(r) < 4 or r[0].lower().startswith("group"):
                continue
            gia_tri = lam_sach(r[2]) if la_ghi_chu(r[2]) else r[2]
            gia_tri = re.sub(r"\*\*", "", gia_tri).strip()
            if not gia_tri:
                continue
            specs.append(dict(
                group_key=r[0][:100] or None,
                label=re.sub(r"\*\*", "", r[1])[:500],
                value=gia_tri[:2000],
                unit=(None if r[3] in ("-", "—", "") else r[3][:100]),
            ))

        # Bang so sanh model con / bien the -> giu lai duoi dang spec co group rieng
        for ten_bang, nhan in (("Bảng so sánh", "Biến thể"), ("Bảng các model con", "Model")):
            khoi = tim_muc(secs, ten_bang)
            if not khoi:
                continue
            rows = bang(khoi)
            if len(rows) < 2:
                continue
            header = rows[0]
            for r in rows[1:]:
                if len(r) != len(header):
                    continue
                for i in range(1, len(header)):
                    gt = re.sub(r"\*\*", "", r[i]).strip()
                    if not gt or gt in ("-", "—"):
                        continue
                    specs.append(dict(
                        group_key=f"{nhan}: {re.sub(r'[*]', '', r[0])}"[:100],
                        label=re.sub(r"\*\*", "", header[i])[:500],
                        value=gt[:2000],
                        unit=None,
                    ))

        # Standards
        standards = []
        for r in bang(tim_muc(secs, "Standards")):
            if len(r) < 2 or "standard" in r[0].lower():
                continue
            ct = chuan_hoa_ct(r[1])
            note = r[2] if len(r) > 2 else ""
            note = lam_sach(note)
            note = re.sub(r"\*\*", "", note).strip() or None
            for org, code in tach_ma_chuan(r[0]):
                org, code = BI_DANH.get((org, code), (org, code))
                s = slug_chuan(org, code)
                tat_ca_chuan[s] = dict(organization=org.upper(), code=code, slug=s)
                if not any(x["slug"] == s for x in standards):
                    standards.append(dict(slug=s, compliance_type=ct,
                                          note=(note[:2000] if note else None)))

        # VA LO HONG: san pham dang "platform" (70Xe Series) co tieu chuan nam
        # trong BANG MODEL CON chu khong o muc Standards. Khong gom len cap san
        # pham thi no vo hinh trong bo loc theo tieu chuan (ADR-007).
        if not standards:
            for ten_bang in ("Bảng các model con", "Bảng so sánh"):
                khoi = tim_muc(secs, ten_bang)
                if not khoi:
                    continue
                rows = bang(khoi)
                if len(rows) < 2:
                    continue
                cot = [i for i, h in enumerate(rows[0])
                       if re.search(r"(?i)standard|method|tiêu chuẩn", h)]
                for r in rows[1:]:
                    for i in cot:
                        if i >= len(r):
                            continue
                        # Truyen NGUYEN o vao bo tach — cat truoc theo dau phay se
                        # lam 'D7777' mat ngu canh to chuc 'ASTM' o dau chuoi.
                        for org, code in tach_ma_chuan(r[i]):
                            org, code = BI_DANH.get((org, code), (org, code))
                            s = slug_chuan(org, code)
                            tat_ca_chuan[s] = dict(organization=org.upper(),
                                                   code=code, slug=s)
                            if not any(x["slug"] == s for x in standards):
                                standards.append(dict(slug=s,
                                                      compliance_type="compliance",
                                                      note=None))

        # Anh dai dien
        anh = tim_muc(secs, "Ảnh đại diện")
        m = re.search(r"^\s*-\s*File[^:]*:\s*(.+)$", anh, re.M | re.I)
        duong_dan_anh = None
        if m:
            goc_dong = m.group(1).strip()
            # Phai xet "khong co" tren chuoi GOC truoc: dong bao khong co anh van
            # co the nhac toi mot duong dan THU MUC trong dau `...` (vd HVP 972:
            # "không có — đã kiểm tra thư mục `D:\\...\\`"), lay ra se thanh anh ma.
            khong_co_anh = bool(re.match(r"(?i)^(không|khong)\s+có", goc_dong)) or bool(
                re.search(r"(?i)^KHÔNG CÓ|DO NOT USE", goc_dong)
            )
            gt = goc_dong
            # Duong dan thuong nam trong dau `...` va co mo ta di kem phia sau;
            # phai cat dung phan duong dan (da tung lam OptiFlash khong nap duoc anh).
            trong_nhay = re.search(r"`([^`]+)`", gt)
            if trong_nhay:
                gt = trong_nhay.group(1).strip()
            else:
                het_duoi = re.match(r"(?i)^(.*?\.(?:jpg|jpeg|png|tif|tiff|webp))\b", gt)
                if het_duoi:
                    gt = het_duoi.group(1).strip()
            la_file_anh = bool(re.search(r"(?i)\.(jpg|jpeg|png|tif|tiff|webp)$", gt))
            if re.search(r"[A-Za-z]:\\", gt) and la_file_anh and not khong_co_anh:
                duong_dan_anh = gt

        # Ghi chu noi bo -> tach ra tai lieu rieng
        for k, v in secs.items():
            for line in v.split("\n"):
                line = line.strip().lstrip("- ").strip()
                if len(line) > 30 and la_ghi_chu(line) and not line.startswith("|"):
                    ghi_chu_tach_ra.append(dict(san_pham=ten, muc=k, noi_dung=line))

        san_pham.append(dict(
            file=ten_file, name=ten, model=model or None,
            slug=anh_xa["slug"], brand=anh_xa["brand"], product_type=product_type,
            short_description=short,
            seo_title=f"{ten} | {anh_xa['brand'].upper().replace('-', ' ')} | LT Vietnam"[:255],
            seo_description=(short[:300] if short else ten)[:500],
            categories=anh_xa["categories"], applications=anh_xa["applications"],
            industries=anh_xa["industries"],
            overview=overview, features=features, applications_text=applications,
            principle=principle, sample_types=sample_types,
            operating_conditions=operating, accessories_options=accessories,
            specifications=specs, standards=standards, image_path=duong_dan_anh,
        ))

    ket_qua = dict(
        version=1,
        brands_moi=BRAND_MOI,
        categories_moi=DANH_MUC_MOI,
        standards=sorted(tat_ca_chuan.values(), key=lambda x: x["slug"]),
        products=san_pham,
    )

    out_path = os.path.join(DATA_DIR, "du-lieu-chuan-hoa.json")
    io.open(out_path, "w", encoding="utf-8").write(
        json.dumps(ket_qua, ensure_ascii=False, indent=2))

    # Tai lieu ghi chu noi bo
    doc29 = os.path.join(DOC_DIR, "29_DIEM_CAN_XAC_MINH_VOI_HANG.md")
    with io.open(doc29, "w", encoding="utf-8") as f:
        f.write("# 29 — ĐIỂM CẦN XÁC MINH VỚI HÃNG\n\n")
        f.write("**Sinh tự động** bởi `doc/data/lab-products/tools/chuan_hoa.py` — đừng sửa tay.\n\n")
        f.write("Đây là các ghi chú nội bộ đã được **tách khỏi nội dung công khai** ")
        f.write("để khách hàng không đọc thấy. Xem [doc 28 mục 5.7](28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md).\n\n")
        hien_tai = None
        for g in ghi_chu_tach_ra:
            if g["san_pham"] != hien_tai:
                hien_tai = g["san_pham"]
                f.write(f"\n## {hien_tai}\n\n")
            f.write(f"- **{g['muc']}** — {g['noi_dung']}\n")

    print(f"San pham:        {len(san_pham)}")
    print(f"Tieu chuan:      {len(tat_ca_chuan)}")
    print(f"Ghi chu tach ra: {len(ghi_chu_tach_ra)}")
    print(f"-> {out_path}")
    print(f"-> {doc29}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
