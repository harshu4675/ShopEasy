export const validatePhone = (phone) => {
  if (!phone) return { valid: false, error: "Phone number is required" };
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) {
    return { valid: false, error: "Phone must be 10 digits" };
  }
  if (!/^[6-9]/.test(cleaned)) {
    return { valid: false, error: "Phone must start with 6, 7, 8 or 9" };
  }
  return { valid: true };
};

export const validatePincode = (pincode) => {
  if (!pincode) return { valid: false, error: "Pincode is required" };
  const cleaned = pincode.replace(/\D/g, "");
  if (cleaned.length !== 6) {
    return { valid: false, error: "Pincode must be 6 digits" };
  }
  if (!/^[1-9][0-9]{5}$/.test(cleaned)) {
    return { valid: false, error: "Invalid pincode format" };
  }
  return { valid: true };
};

export const validateName = (name) => {
  if (!name || !name.trim()) {
    return { valid: false, error: "Full name is required" };
  }
  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: "Name must be at least 3 characters" };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "Name too long (max 50 characters)" };
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters and spaces" };
  }
  return { valid: true };
};

export const validateAddress = (address) => {
  if (!address || !address.trim()) {
    return { valid: false, error: "Address is required" };
  }
  const trimmed = address.trim();
  if (trimmed.length < 10) {
    return {
      valid: false,
      error:
        "Address too short (min 10 characters). Include house, street, area",
    };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: "Address too long (max 200 characters)" };
  }
  return { valid: true };
};

const pincodeCache = new Map();

export const lookupPincode = async (pincode) => {
  const cleaned = pincode.replace(/\D/g, "");
  if (cleaned.length !== 6) {
    return { success: false, error: "Invalid pincode length" };
  }

  if (pincodeCache.has(cleaned)) {
    return { success: true, data: pincodeCache.get(cleaned) };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://api.postalpincode.in/pincode/${cleaned}`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: "Pincode service unavailable" };
    }

    const json = await response.json();

    if (
      !Array.isArray(json) ||
      json.length === 0 ||
      json[0].Status !== "Success" ||
      !json[0].PostOffice ||
      json[0].PostOffice.length === 0
    ) {
      return { success: false, error: "Pincode not found" };
    }

    const office = json[0].PostOffice[0];
    const data = {
      pincode: cleaned,
      area: office.Name || "",
      city: office.District || office.Block || "",
      state: office.State || "",
      country: office.Country || "India",
      deliverable: true,
    };

    pincodeCache.set(cleaned, data);
    return { success: true, data };
  } catch (err) {
    if (err.name === "AbortError") {
      return { success: false, error: "Pincode check timed out" };
    }
    return { success: false, error: "Could not verify pincode" };
  }
};

export const validateIFSC = (ifsc) => {
  if (!ifsc) return { valid: false, error: "IFSC code is required" };
  const cleaned = ifsc.toUpperCase().trim();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned)) {
    return { valid: false, error: "Invalid IFSC format (e.g. SBIN0001234)" };
  }
  return { valid: true, value: cleaned };
};

export const validateAccountNumber = (acc) => {
  if (!acc) return { valid: false, error: "Account number is required" };
  const cleaned = acc.replace(/\s/g, "");
  if (!/^\d{9,18}$/.test(cleaned)) {
    return { valid: false, error: "Account number must be 9 to 18 digits" };
  }
  return { valid: true, value: cleaned };
};
