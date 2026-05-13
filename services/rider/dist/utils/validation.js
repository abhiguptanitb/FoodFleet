import Joi from "joi";
const validationOptions = {
    abortEarly: true,
    convert: true,
    stripUnknown: true,
};
const aadharNumber = Joi.string()
    .trim()
    .custom((value) => value.replace(/\s/g, ""))
    .pattern(/^\d{12}$/)
    .required()
    .messages({
    "string.empty": "Aadhaar number is required",
    "string.pattern.base": "Aadhaar number must contain exactly 12 digits",
    "any.required": "Aadhaar number is required",
});
const phoneNumber = Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
    "string.empty": "Phone number is required",
    "string.pattern.base": "Phone number must be a valid 10 digit Indian mobile number",
    "any.required": "Phone number is required",
});
const drivingLicenseNumber = Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{7,13}$/)
    .required()
    .messages({
    "string.empty": "Driving licence number is required",
    "string.pattern.base": "Driving licence number must start with 2 letters, 2 digits, and contain only letters/numbers",
    "any.required": "Driving licence number is required",
});
const latitude = Joi.number().min(-90).max(90).messages({
    "number.base": "Valid latitude and longitude are required",
    "number.min": "Valid latitude and longitude are required",
    "number.max": "Valid latitude and longitude are required",
});
const longitude = Joi.number().min(-180).max(180).messages({
    "number.base": "Valid latitude and longitude are required",
    "number.min": "Valid latitude and longitude are required",
    "number.max": "Valid latitude and longitude are required",
});
const riderProfileSchema = (requireLocation = false) => Joi.object({
    phoneNumber,
    aadharNumber,
    drivingLicenseNumber,
    latitude: requireLocation
        ? latitude.required().messages({
            "any.required": "Valid latitude and longitude are required",
        })
        : latitude.optional(),
    longitude: requireLocation
        ? longitude.required().messages({
            "any.required": "Valid latitude and longitude are required",
        })
        : longitude.optional(),
});
const locationSchema = Joi.object({
    latitude: latitude.required().messages({
        "any.required": "Valid latitude and longitude are required",
    }),
    longitude: longitude.required().messages({
        "any.required": "Valid latitude and longitude are required",
    }),
});
const validateWithSchema = (schema, body) => {
    const { error, value } = schema.validate(body, validationOptions);
    if (error) {
        return { error: error.details[0]?.message || "Invalid input" };
    }
    return { value };
};
export const validateRiderProfileInput = (body, options = {}) => {
    return validateWithSchema(riderProfileSchema(Boolean(options.requireLocation)), body);
};
export const validateLocationInput = (body) => {
    return validateWithSchema(locationSchema, body);
};
