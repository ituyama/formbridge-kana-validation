(() => {
  "use strict";

  const FULLWIDTH_FIELDS = [
    "hojin_mei_kana",
    "daihyo_shimei_kana",
    "tanto_shimei_kana"
  ];

  const ACCOUNT_FIELDS = ["koza_meigi"];

  const FULLWIDTH_MESSAGE =
    "全角カタカナと全角スペースのみ入力してください。";
  const ACCOUNT_MESSAGE =
    "半角カタカナ（大文字）と半角の () . のみ入力してください。";

  const FULLWIDTH_PATTERN = /^[ァ-ヺー　]+$/u;
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
      pattern: FULLWIDTH_PATTERN,
      message: FULLWIDTH_MESSAGE
    });
  });
  ACCOUNT_FIELDS.forEach((fieldCode) => {
    rules.push({
      fieldCode,
      pattern: ACCOUNT_PATTERN,
      message: ACCOUNT_MESSAGE
    });
  });

  const fieldOnPage = (fieldCode) => {
    try {
      const escaped = CSS.escape(fieldCode);
      const el =
        document.getElementById(fieldCode) ||
        document.querySelector(`[name="${escaped}"]`);
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return el.getClientRects().length > 0;
    } catch (e) {
      return false;
    }
  };

  const setError = (fieldCode, message) => {
    if (!fieldOnPage(fieldCode)) return;
    try {
      formBridge.fn.setFieldValueError(fieldCode, message);
    } catch (e) {}
  };

  const validateField = (rule, value) => {
    const text = String(value ?? "");
    const isValid = text === "" || rule.pattern.test(text);
    setError(rule.fieldCode, isValid ? null : rule.message);
    return isValid;
  };

  rules.forEach((rule) => {
    formBridge.events.on(`form.field.change.${rule.fieldCode}`, (context) => {
      validateField(rule, context.value);
    });
  });

  const validateAll = (context, currentPageOnly) => {
    const record = formBridge.fn.getRecord();
    let isAllValid = true;

    rules.forEach((rule) => {
      if (!(record && record[rule.fieldCode])) return;
      if (currentPageOnly && !fieldOnPage(rule.fieldCode)) return;
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
