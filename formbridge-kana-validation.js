(() => {
  "use strict";

  const FULLWIDTH_FIELDS = [
    "daihyo_shimei_kana",
    "tanto_shimei_kana"
  ];

  const HOJIN_KANA_FIELDS = ["hojin_mei_kana"];
  const NO_HALF_SPACE_FIELDS = ["daihyo_shimei", "tanto_shimei"];
  const ACCOUNT_FIELDS = ["koza_meigi"];

  const FULLWIDTH_MESSAGE =
    "全角カタカナと全角スペースのみ入力してください。";
  const HOJIN_KANA_MESSAGE =
    "全角カタカナのみ入力してください。スペースは使えません。";
  const NO_HALF_SPACE_MESSAGE = "半角スペースは入力できません。";
  const ACCOUNT_MESSAGE =
    "半角カタカナ（大文字）と半角の () . のみ入力してください。";

  const FULLWIDTH_PATTERN = /^[ァ-ヺー　]+$/u;
  const HOJIN_KANA_PATTERN = /^[ァ-ヺー]+$/u;
  // ｦ・ｱ-ﾝ・長音・濁点半濁点。ｧｨｩｪｫｬｭｮｯ は含めない。
  const ACCOUNT_PATTERN = /^[ｦｰｱ-ﾝﾞﾟ.()]+$/u;

  const fieldValue = (record, fieldCode) => {
    const field = record && record[fieldCode];
    if (field == null) return "";
    if (typeof field === "object" && "value" in field) {
      return field.value == null ? "" : String(field.value);
    }
    return String(field);
  };

  const rules = [];
  FULLWIDTH_FIELDS.forEach((fieldCode) => {
    rules.push({
      fieldCode,
      test: (text) => FULLWIDTH_PATTERN.test(text),
      message: FULLWIDTH_MESSAGE
    });
  });
  HOJIN_KANA_FIELDS.forEach((fieldCode) => {
    rules.push({
      fieldCode,
      test: (text) => HOJIN_KANA_PATTERN.test(text),
      message: HOJIN_KANA_MESSAGE
    });
  });
  NO_HALF_SPACE_FIELDS.forEach((fieldCode) => {
    rules.push({
      fieldCode,
      test: (text) => !/ /.test(text),
      message: NO_HALF_SPACE_MESSAGE
    });
  });
  ACCOUNT_FIELDS.forEach((fieldCode) => {
    rules.push({
      fieldCode,
      test: (text) => ACCOUNT_PATTERN.test(text),
      message: ACCOUNT_MESSAGE
    });
  });

  const lastError = {};
  let writing = false;

  const fieldExists = (fieldCode) => {
    try {
      return !!(
        document.getElementById(fieldCode) ||
        document.querySelector('[name="' + CSS.escape(fieldCode) + '"]')
      );
    } catch (e) {
      return false;
    }
  };

  const setError = (fieldCode, message) => {
    const next = message || null;
    if (lastError[fieldCode] === next) return;
    if (!fieldExists(fieldCode)) return;
    lastError[fieldCode] = next;
    writing = true;
    try {
      formBridge.fn.setFieldValueError(fieldCode, next);
    } catch (e) {
    } finally {
      writing = false;
    }
  };

  const validateField = (rule, value) => {
    const text = String(value ?? "");
    const isValid = text === "" || rule.test(text);
    setError(rule.fieldCode, isValid ? null : rule.message);
    return isValid;
  };

  const blockSpaceCodes = new Set([...HOJIN_KANA_FIELDS, ...NO_HALF_SPACE_FIELDS]);
  document.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== " " && ev.code !== "Space") return;
      const target = ev.target;
      if (!target) return;
      const code = target.id || target.getAttribute("name");
      if (blockSpaceCodes.has(code)) ev.preventDefault();
    },
    true
  );

  rules.forEach((rule) => {
    formBridge.events.on(`form.field.change.${rule.fieldCode}`, (context) => {
      if (writing) return;
      validateField(rule, context.value);
    });
  });

  const validateAll = (context, currentPageOnly) => {
    if (writing) return;
    const record = formBridge.fn.getRecord();
    let isAllValid = true;

    rules.forEach((rule) => {
      if (!(record && record[rule.fieldCode])) return;
      if (currentPageOnly && !fieldExists(rule.fieldCode)) return;
      if (!validateField(rule, fieldValue(record, rule.fieldCode))) {
        isAllValid = false;
      }
    });

    if (!isAllValid) {
      context.preventDefault();
    }
  };

  formBridge.events.on("form.confirm", (context) => validateAll(context, false));
  formBridge.events.on("form.submit", (context) => validateAll(context, false));
  formBridge.events.on("form.step.moving", (context) => {
    if (context.nextStep < context.currentStep) return;
    validateAll(context, true);
  });
})();
