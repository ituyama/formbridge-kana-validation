(() => {
  "use strict";

  const FULLWIDTH_FIELDS = [
    "hojin_mei_kana",
    "daihyo_shimei_kana",
    "tanto_shimei_kana"
  ];

  const ACCOUNT_FIELDS = ["koza_meigi"];

  const FULLWIDTH_MESSAGE =
    "全角カタカナで入力してください。（全角スペース・.・()可）";
  const ACCOUNT_MESSAGE =
    "半角カタカナ（大文字）と半角の () . のみ入力してください。";

  const FULLWIDTH_PATTERN = /^[ァ-ヺー　.()]+$/u;
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

  const validateField = (rule, value) => {
    const text = String(value ?? "");
    const isValid = text === "" || rule.pattern.test(text);
    formBridge.fn.setFieldValueError(
      rule.fieldCode,
      isValid ? null : rule.message
    );
    return isValid;
  };

  rules.forEach((rule) => {
    formBridge.events.on(`form.field.change.${rule.fieldCode}`, (context) => {
      validateField(rule, context.value);
    });
  });

  const validateAll = (context) => {
    const record = formBridge.fn.getRecord();
    let isAllValid = true;

    rules.forEach((rule) => {
      if (!(record && record[rule.fieldCode])) return;
      if (!validateField(rule, fieldValue(record, rule.fieldCode))) {
        isAllValid = false;
      }
    });

    if (!isAllValid) {
      context.preventDefault();
    }
  };

  formBridge.events.on("form.confirm", validateAll);
  formBridge.events.on("form.submit", validateAll);
  formBridge.events.on("form.step.moving", (context) => {
    if (context.nextStep < context.currentStep) return;
    validateAll(context);
  });
})();
