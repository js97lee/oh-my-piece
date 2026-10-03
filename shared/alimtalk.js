const VARIABLE_PATTERN = /#\{([^{}]+)\}/g;

export function templateVariables(template) {
  if (!template) return [];
  const texts = [template.content, template.title, ...(template.buttons || []).flatMap(Object.values)];
  return [...new Set(texts.flatMap((text) => [...String(text || "").matchAll(VARIABLE_PATTERN)].map((match) => match[1])))];
}

export function fillVariables(text, values) {
  return String(text || "").replace(VARIABLE_PATTERN, (match, key) =>
    Object.hasOwn(values, key) && values[key] !== "" ? values[key] : match,
  );
}

export function renderTemplate(template, values) {
  return {
    content: fillVariables(template.content, values),
    title: fillVariables(template.title, values),
    buttons: template.buttons.map((button) => Object.fromEntries(
      Object.entries(button).map(([key, value]) => [key, fillVariables(value, values)]),
    )),
  };
}
