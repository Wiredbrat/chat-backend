export function isString(string) {
  return typeof string === "string" && string?.trim() !== "" && string !== undefined && string !== null;
}

export function isStringMulti(...string) {
  const invalidItem = string.find(item =>
    typeof item !== "string" ||
    item.trim() === "" ||
    item === undefined ||
    item === null
  );

  return invalidItem !== undefined
    ? { valid: false, invalidItem }
    : { valid: true };
}

export function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Standard email validation regular expression
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
