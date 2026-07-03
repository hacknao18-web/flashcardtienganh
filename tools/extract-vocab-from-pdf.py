import hashlib
import json
import re
import subprocess
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "2000-tu-vung-tieng-anh-B2.pdf"
JSON_PATH = ROOT / "vocabulary.json"
JS_PATH = ROOT / "vocab-data.js"


def fix_mojibake(value):
    if not isinstance(value, str):
        return value
    try:
        fixed = value.encode("cp1252").decode("utf-8")
    except UnicodeError:
        fixed = value
    fixed = fixed.replace("’", "'").replace("“", '"').replace("”", '"')
    fixed = fixed.replace("–", "-").replace("—", "-").replace("\u00a0", " ")
    fixed = re.sub(r"\s+", " ", fixed).strip()
    return clean_spacing(fixed)


def clean_spacing(value):
    replacements = {
        "Sựva": "Sự va",
        "Sựnhận": "Sự nhận",
        "Sựquay": "Sự quay",
        "Sựxoay": "Sự xoay",
        "Sựphân": "Sự phân",
        "Sựra": "Sự ra",
        "Sựgợi": "Sự gợi",
        "Sựthất": "Sự thất",
        "Sựsụp": "Sự sụp",
        "Sựrõ": "Sự rõ",
        "Sựtruyền": "Sự truyền",
        "Sựthiếu": "Sự thiếu",
        "Sựtrầm": "Sự trầm",
        "Sựchắc": "Sự chắc",
        "Sựbiến": "Sự biến",
        "Sựphơi": "Sự phơi",
        "Sựchẩn": "Sự chẩn",
        "Sựtàn": "Sự tàn",
        "Sựrối": "Sự rối",
        "Sựquá": "Sự quá",
        "Sựcài": "Sự cài",
        "Sựbảo": "Sự bảo",
        "Sựcó": "Sự có",
        "Sựdạy": "Sự dạy",
        "Sựđọc": "Sự đọc",
        "Sựxếp": "Sự xếp",
        "Sựtích": "Sự tích",
        "sựchâm": "sự châm",
        "sựbiết": "sự biết",
        "sựxuất": "sự xuất",
        "sựkèm": "sự kèm",
        "sựphục": "sự phục",
        "sựbéo": "sự béo",
        "sựsống": "sự sống",
        "sựsuy": "sự suy",
        "sựtrầm": "sự trầm",
        "sựdinh": "sự dinh",
        "Dễvỡ": "Dễ vỡ",
        "dễgãy": "dễ gãy",
        "vỡra": "vỡ ra",
        "cổtay": "cổ tay",
        "sổtay": "sổ tay",
        "Vẻduyên": "Vẻ duyên",
        "Ngớngẩn": "Ngớ ngẩn",
        "Tỉmỉ": "Tỉ mỉ",
        "lốbịch": "lố bịch",
        "thểtránh": "thể tránh",
        "thểnhìn": "thể nhìn",
        "thểdục": "thể dục",
        "chỉrõ": "chỉ rõ",
        "bổnhào": "bổ nhào",
        "đổnát": "đổ nát",
        "sốkhông": "số không",
        "taytrắng": "tay trắng",
        "dịch vụchăm": "dịch vụ chăm",
        "quảcật": "quả cật",
        "dụng cụlàm": "dụng cụ làm",
        "bộđồnghề": "bộ đồ nghề",
        "thuốc thuốc": "thuốc, dược phẩm",
        "mởđầu": "mở đầu",
        "làm nhẹbớt": "làm nhẹ bớt",
        "bổsung": "bổ sung",
        "vềphẫu": "về phẫu",
        "vềâm": "về âm",
        "thờphụng": "thờ phụng",
        "Bộlạc": "Bộ lạc",
        "chủnghĩa": "chủ nghĩa",
        "xứđạo": "xứ đạo",
        "giữchức": "giữ chức",
        "sốlượng": "số lượng",
        "trịchuyên": "trị chuyên",
        "dữdội": "dữ dội",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    return value


def slugify(value):
    value = value.lower().strip()
    value = re.sub(r"[’']", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "item"


def stable_id(topic, word, pos, meaning):
    base = f"{slugify(topic)}-{slugify(word)}"
    digest = hashlib.sha1(f"{topic}|{word}|{pos}|{meaning}".encode("utf-8")).hexdigest()[:8]
    return f"{base}-{digest}"


def read_seed_data():
    try:
        raw = subprocess.check_output(["git", "show", "HEAD:vocabulary.json"], cwd=ROOT)
        return json.loads(raw.decode("utf-8-sig"))
    except Exception:
        return json.loads(JSON_PATH.read_text(encoding="utf-8-sig"))


def pdf_text():
    doc = fitz.open(PDF_PATH)
    return "\n".join(page.get_text() for page in doc)


def normalize_item(item):
    normalized = {key: fix_mojibake(item.get(key, "")) for key in ["word", "pos", "meaning", "example", "topic"]}
    normalized["word"] = re.sub(r"\s+", " ", normalized["word"]).strip()
    normalized["id"] = stable_id(normalized["topic"], normalized["word"], normalized["pos"], normalized["meaning"])
    return normalized


def patch_known_pdf_splits(items):
    patched = []
    skip_next = False
    drop_words = {"divided by 4 is 2, remainder 1."}
    replacements = {
        "accomplish|": {
            "word": "accomplishment",
            "pos": "n.",
            "meaning": "Thành tựu, thành tích",
            "example": "Learning English is one of my greatest accomplishments",
        },
        "accumulatio|": {
            "word": "accumulation",
            "pos": "n.",
            "meaning": "Sự tích lũy, tích tụ",
            "example": "The river became almost unrecognizable because of the accumulation of rubbish",
        },
        "faculty|n.": {
            "word": "faculty",
            "pos": "n.",
            "meaning": "Khoa",
            "example": "Today the principal will meet students who are doing degrees in the Arts Faculty",
        },
        "remainder|n.": {
            "word": "remainder",
            "pos": "n.",
            "meaning": "phần còn lại",
            "example": "9 divided by 4 is 2, remainder 1.",
        },
        "thought-pro|": {
            "word": "thought-provoking",
            "pos": "adj.",
            "meaning": "Đáng suy nghĩ, kích thích tư duy",
            "example": "This is an entertaining yet thought-provoking film",
        },
        "acid|n., adj.": {
            "word": "acid",
            "pos": "n., adj.",
            "meaning": "Axit",
            "example": "In some areas, severe air pollution has resulted in acid rain. It's a very juicy fruit with a slightly acid flavor",
        },
        "carbon|n.": {
            "word": "carbon",
            "pos": "n.",
            "meaning": "Cacbon",
            "example": "Carbon emissions are rising at an alarming rate",
        },
        "encourage|": {
            "word": "encouragement",
            "pos": "n.",
            "meaning": "Sự khuyến khích, khích lệ, cổ vũ",
            "example": "With a little encouragement from his parents he should do well",
        },
        "encouragin|": {
            "word": "encouraging",
            "pos": "adj.",
            "meaning": "Khích lệ, cổ vũ",
            "example": "His parents remain encouraging despite bad grades",
        },
        "delicate|adj.": {
            "word": "delicate",
            "pos": "adj.",
            "meaning": "Mong manh",
            "example": "The eye is one of the most delicate organs of the body",
        },
        "psychiatric|": {
            "word": "psychiatric",
            "pos": "adj.",
            "meaning": "(thuộc) bệnh tâm thần",
            "example": "This is an interesting psychiatric case study of a child with extreme behavioral difficulties.",
        },
        "scratch|": {
            "word": "scratch",
            "pos": "v., n.",
            "meaning": "vết xước; vết thương nhẹ; cào, làm xước da",
            "example": "I'd scratched my leg and it was bleeding.",
        },
        "severely|": {
            "word": "severely",
            "pos": "adv.",
            "meaning": "Khắc khe, gay gắt; rất gay go, khốc liệt, dữ dội",
            "example": "The crops were severely damaged. Anyone breaking the law will be severely punished.",
        },
        "supplement|": {
            "word": "supplement",
            "pos": "v., n.",
            "meaning": "thực phẩm bổ sung",
            "example": "The doctor said she should be taking vitamin supplements.",
        },
        "surgical|": {
            "word": "surgical",
            "pos": "adj.",
            "meaning": "thuộc về phẫu thuật",
            "example": "These surgical procedures are rarely used today and have been replaced by additive hormonal therapies.",
        },
        "terminal|": {
            "word": "terminal",
            "pos": "n., adj.",
            "meaning": "giai đoạn cuối",
            "example": "She has terminal cancer.",
        },
        "trigger|": {
            "word": "trigger",
            "pos": "v., n.",
            "meaning": "Gây ra",
            "example": "Nuts can trigger off a violent allergic reaction",
        },
        "useless|": {
            "word": "useless",
            "pos": "adj.",
            "meaning": "vô dụng",
            "example": "This drug is useless in the treatment of patients with AIDS",
        },
        "visible|": {
            "word": "visible",
            "pos": "adj.",
            "meaning": "có thể nhìn thấy được, rõ ràng",
            "example": "There are few visible signs of the illness that kept her in hospital for so long.",
        },
    }

    for index, item in enumerate(items):
        if skip_next:
            skip_next = False
            continue

        if item["word"] in drop_words:
            continue

        replacement = replacements.get(f"{item['word']}|{item['pos']}")
        if replacement:
            item = {**item, **replacement}

        if item["word"] == "tragic" and index + 1 < len(items) and items[index + 1]["word"] == "27":
            patched.append({
                "topic": "1: Accidents",
                "word": "tragic",
                "pos": "adj.",
                "meaning": "Bi thảm, thảm thương",
                "example": "He was killed in a tragic accident at the age of 24",
            })
            patched.append({
                "topic": "1: Accidents",
                "word": "wrist",
                "pos": "n.",
                "meaning": "cổ tay",
                "example": "I sprained my wrist playing tennis.",
            })
            skip_next = True
            continue

        if item["word"] == "correspondenc":
            patched.append({
                "topic": "3: Communication",
                "word": "correspondence",
                "pos": "n.",
                "meaning": "Thư từ",
                "example": "I have seen the correspondence between the company and the college",
            })
            continue

        if item["word"] == "counter (argue":
            patched.append({
                "topic": "3: Communication",
                "word": "counter",
                "pos": "v.",
                "meaning": "Phản đối, chống lại",
                "example": "I tried to argue but he countered that the plans were not yet finished",
            })
            continue

        if item["word"] == "transmission" and item["topic"] == "11: Health and Well-being":
            item["meaning"] = "Sự truyền"

        word_pos = re.fullmatch(r"(.+)\s+(n\.|v\.|adj\.|adv\.)", item["word"])
        if word_pos and not item["pos"]:
            item["word"] = word_pos.group(1).strip()
            item["pos"] = word_pos.group(2)

        patched.append(item)

    result = []
    for item in patched:
        item["id"] = stable_id(item["topic"], item["word"], item["pos"], item["meaning"])
        result.append(item)
    return result


def write_outputs(items):
    JSON_PATH.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    JS_PATH.write_text(
        "const VOCABULARY = " + json.dumps(items, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
        newline="\n",
    )


def main():
    if not PDF_PATH.exists():
        raise SystemExit(f"Missing PDF: {PDF_PATH}")

    text = pdf_text()
    if "Một cách tình cờ" not in text or "Topic 11: Health and Well-being" not in text:
        raise SystemExit("PDF text extraction sanity check failed.")

    seed = read_seed_data()
    items = [normalize_item(item) for item in seed]
    items = patch_known_pdf_splits(items)
    write_outputs(items)
    print(f"Cleaned {len(items)} entries across {len({item['topic'] for item in items})} topics.")
    print("PDF Unicode sanity check passed.")


if __name__ == "__main__":
    main()
