(() => {
  "use strict";

  const FIELD_CODES = [
    "hojin_mei_kana",
    "daihyo_shimei_kana",
    "tanto_shimei_kana",
    "koza_meigi"
  ];

  const ERROR_MESSAGE = "全角カタカナで入力してください。";
  const KATAKANA_PATTERN = /^[ァ-ヺー　]+$/u;

  const fieldValue = (record, fieldCode) => {
    const field = record && record[fieldCode];
    if (field == null) return "";
    if (typeof field === "object" && "value" in field) {
      return field.value == null ? "" : String(field.value);
    }
    return String(field);
  };

  const validateField = (fieldCode, value) => {
    const text = String(value ?? "");
    const isValid = text === "" || KATAKANA_PATTERN.test(text);
    formBridge.fn.setFieldValueError(
      fieldCode,
      isValid ? null : ERROR_MESSAGE
    );
    return isValid;
  };

  FIELD_CODES.forEach((fieldCode) => {
    formBridge.events.on(`form.field.change.${fieldCode}`, (context) => {
      validateField(fieldCode, context.value);
    });
  });

  const validateAll = (context) => {
    const record = formBridge.fn.getRecord();
    let isAllValid = true;

    FIELD_CODES.forEach((fieldCode) => {
      if (!(record && record[fieldCode])) return;
      if (!validateField(fieldCode, fieldValue(record, fieldCode))) {
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
