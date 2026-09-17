(() => {
  "use strict";

  const FULLWIDTH_FIELDS = [
    "daihyo_shimei_kana",
    "tanto_shimei_kana"
  ];

  const HOJIN_KANA_FIELDS = ["hojin_mei_kana"];
  const NO_HALF_SPACE_FIELDS = ["daihyo_shimei", "tanto_shimei"];
  const FULL_KANA_CHAR = /[ァ-ヺー]/u;
  const FULL_KANA_OR_SPACE = /[ァ-ヺー　]/u;

  const HANKANA =
    "｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ";
  const ZENKANA =
    "。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン゛゜";
  const DAKUTEN = {
    カ: "ガ",
    キ: "ギ",
    ク: "グ",
    ケ: "ゲ",
    コ: "ゴ",
    サ: "ザ",
    シ: "ジ",
    ス: "ズ",
    セ: "ゼ",
    ソ: "ゾ",
    タ: "ダ",
    チ: "ヂ",
    ツ: "ヅ",
    テ: "デ",
    ト: "ド",
    ハ: "バ",
    ヒ: "ビ",
    フ: "ブ",
    ヘ: "ベ",
    ホ: "ボ",
    ウ: "ヴ",
    ワ: "ヷ",
    ヰ: "ヸ",
    ヱ: "ヹ",
    ヲ: "ヺ"
  };
  const HANDAKU = { ハ: "パ", ヒ: "ピ", フ: "プ", ヘ: "ペ", ホ: "ポ" };

  const toFullwidthKatakanaChar = (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x3041 && code <= 0x3096) return String.fromCharCode(code + 0x60);
    const index = HANKANA.indexOf(ch);
    return index >= 0 ? ZENKANA.charAt(index) : ch;
  };

  const toFullwidthKatakana = (text) => {
    const chars = [];
    for (const raw of String(text ?? "")) {
      const ch = toFullwidthKatakanaChar(raw);
      const prev = chars[chars.length - 1];
      if (ch === "゛" && prev && DAKUTEN[prev]) {
        chars[chars.length - 1] = DAKUTEN[prev];
        continue;
      }
      if (ch === "゜" && prev && HANDAKU[prev]) {
        chars[chars.length - 1] = HANDAKU[prev];
        continue;
      }
      chars.push(ch);
    }
    return chars.join("");
  };

  const keepChars = (text, allowed) => {
    let out = "";
    for (const ch of text) {
      if (allowed.test(ch)) out += ch;
    }
    return out;
  };

  const sanitizeHojinKana = (text) =>
    keepChars(toFullwidthKatakana(text), FULL_KANA_CHAR);
  const sanitizeFullwidthKana = (text) =>
    keepChars(toFullwidthKatakana(text), FULL_KANA_OR_SPACE);
  const sanitizeNoHalfSpace = (text) =>
    String(text ?? "").replace(/\u0020/g, "");

  const fieldEl = (fieldCode) => {
    try {
      return (
        document.getElementById(fieldCode) ||
        document.querySelector('[name="' + CSS.escape(fieldCode) + '"]')
      );
    } catch (e) {
      return null;
    }
  };

  const rules = [];
  FULLWIDTH_FIELDS.forEach((fieldCode) => {
    rules.push({ fieldCode, sanitize: sanitizeFullwidthKana });
  });
  HOJIN_KANA_FIELDS.forEach((fieldCode) => {
    rules.push({ fieldCode, sanitize: sanitizeHojinKana });
  });
  NO_HALF_SPACE_FIELDS.forEach((fieldCode) => {
    rules.push({ fieldCode, sanitize: sanitizeNoHalfSpace });
  });

  const ruleByCode = new Map(rules.map((rule) => [rule.fieldCode, rule]));
  const composing = new Set();
  let writing = false;

  const fieldCodeOf = (el) => {
    if (!el) return "";
    const code = el.id || el.getAttribute("name") || "";
    return ruleByCode.has(code) ? code : "";
  };

  const setNative = (el, value) => {
    if (!el || !("value" in el) || el.value === value) return;
    const proto =
      el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    const prev = el.value;
    if (el._valueTracker) {
      try {
        el._valueTracker.setValue(prev === value ? value + "\u200b" : prev);
      } catch (e) {}
    }
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const applyValue = (fieldCode, value) => {
    writing = true;
    try {
      setNative(fieldEl(fieldCode), value);
      formBridge.fn.setFieldValue(fieldCode, value);
    } catch (e) {
    } finally {
      writing = false;
    }
  };

  const sanitizeField = (rule, value) => {
    const text = String(value ?? "");
    if (!rule.sanitize) return text;
    const next = rule.sanitize(text);
    if (next !== text) applyValue(rule.fieldCode, next);
    return next;
  };

  const runRule = (rule, value) => {
    if (writing || composing.has(rule.fieldCode)) return;
    sanitizeField(rule, value);
  };

  const blockSpaceCodes = new Set(HOJIN_KANA_FIELDS);
  document.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== " " && ev.code !== "Space") return;
      const code = fieldCodeOf(ev.target);
      if (blockSpaceCodes.has(code)) ev.preventDefault();
    },
    true
  );

  document.addEventListener(
    "beforeinput",
    (ev) => {
      if (ev.isComposing || ev.inputType === "insertCompositionText") return;
      const code = fieldCodeOf(ev.target);
      const rule = ruleByCode.get(code);
      if (!rule || !rule.sanitize || ev.data == null) return;
      const sanitized = rule.sanitize(ev.data);
      if (sanitized === ev.data) return;
      ev.preventDefault();
      if (!sanitized) return;
      try {
        document.execCommand("insertText", false, sanitized);
      } catch (e) {}
    },
    true
  );

  document.addEventListener(
    "compositionstart",
    (ev) => {
      const code = fieldCodeOf(ev.target);
      if (code) composing.add(code);
    },
    true
  );

  document.addEventListener(
    "compositionend",
    (ev) => {
      const code = fieldCodeOf(ev.target);
      if (!code) return;
      composing.delete(code);
      runRule(ruleByCode.get(code), ev.target.value);
    },
    true
  );

  document.addEventListener(
    "input",
    (ev) => {
      if (ev.isComposing) return;
      const code = fieldCodeOf(ev.target);
      if (!code) return;
      runRule(ruleByCode.get(code), ev.target.value);
    },
    true
  );

  rules.forEach((rule) => {
    formBridge.events.on(`form.field.change.${rule.fieldCode}`, (context) => {
      runRule(rule, context.value);
    });
  });
})();
