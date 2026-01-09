export const emailPattern = /^[^\s@]+@[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
export const namePattern = /^[A-Za-z][A-Za-z .'-]+$/;
export const employeeIdPattern = /^[A-Za-z0-9-]*$/;
export const batchYearPattern = /^\d{4}$/;

export const validateEmail = (value: string) => emailPattern.test(value);
