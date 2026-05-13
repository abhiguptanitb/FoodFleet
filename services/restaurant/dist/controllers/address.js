import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import { validateAddressInput } from "../utils/validation.js";
export const addAddress = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const validation = validateAddressInput(req.body);
    if (validation.error) {
        return res.status(400).json({
            message: validation.error,
        });
    }
    const { mobile, formattedAddress, latitude, longitude } = validation.value;
    const newAddress = await Address.create({
        userId: user._id.toString(),
        mobile,
        formattedAddress,
        location: {
            type: "Point",
            coordinates: [longitude, latitude],
        },
    });
    res.json({
        message: "Address Added successfully",
        address: newAddress,
    });
});
export const deleteAddress = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            message: "id is required",
        });
    }
    const address = await Address.findOne({
        _id: id,
        userId: user._id.toString(),
    });
    if (!address) {
        return res.status(404).json({
            message: "Address not found",
        });
    }
    await address.deleteOne();
    res.json({
        message: "Address deleted Successfully",
    });
});
export const getMyAddresses = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const addresses = await Address.find({
        userId: user._id.toString(),
    }).sort({ createdAt: -1 });
    res.json(addresses);
});
