import Joi from "joi";
const addressSchema = Joi.object({
    mobile: Joi.string()
        .trim()
        .pattern(/^[6-9]\d{9}$/)
        .custom((value) => Number(value))
        .required()
        .messages({
        "string.empty": "Mobile number is required",
        "string.pattern.base": "Mobile number must be a valid 10 digit Indian mobile number",
        "any.required": "Mobile number is required",
    }),
    formattedAddress: Joi.string().trim().min(8).max(300).required().messages({
        "string.empty": "Address is required",
        "string.min": "Address must be between 8 and 300 characters",
        "string.max": "Address must be between 8 and 300 characters",
        "any.required": "Address is required",
    }),
    latitude: Joi.number().min(-90).max(90).required().messages({
        "number.base": "Valid latitude and longitude are required",
        "number.min": "Valid latitude and longitude are required",
        "number.max": "Valid latitude and longitude are required",
        "any.required": "Valid latitude and longitude are required",
    }),
    longitude: Joi.number().min(-180).max(180).required().messages({
        "number.base": "Valid latitude and longitude are required",
        "number.min": "Valid latitude and longitude are required",
        "number.max": "Valid latitude and longitude are required",
        "any.required": "Valid latitude and longitude are required",
    }),
});
export const validateAddressInput = (body) => {
    const { error, value } = addressSchema.validate(body, {
        abortEarly: true,
        convert: true,
        stripUnknown: true,
    });
    if (error) {
        return { error: error.details[0]?.message || "Invalid address input" };
    }
    return { value };
};
