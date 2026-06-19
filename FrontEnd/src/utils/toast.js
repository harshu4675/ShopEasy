import { toast } from "react-toastify";

// Toast configuration options
const toastConfig = {
  position: "top-right",
  autoClose: 2000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Success toast
export const showToast = (message, type = "success") => {
  switch (type) {
    case "success":
      toast.success(message, toastConfig);
      break;
    case "error":
      toast.error(message, toastConfig);
      break;
    case "warning":
      toast.warning(message, toastConfig);
      break;
    case "info":
      toast.info(message, toastConfig);
      break;
    default:
      toast(message, toastConfig);
  }
};

// Individual toast functions
export const successToast = (message) => {
  toast.success(message, toastConfig);
};

export const errorToast = (message) => {
  toast.error(message, toastConfig);
};

export const warningToast = (message) => {
  toast.warning(message, toastConfig);
};

export const infoToast = (message) => {
  toast.info(message, toastConfig);
};

// Promise toast (for async operations)
export const promiseToast = (promise, messages) => {
  return toast.promise(
    promise,
    {
      pending: messages.pending || "Processing...",
      success: messages.success || "Success!",
      error: messages.error || "Something went wrong!",
    },
    toastConfig,
  );
};

// Custom toast with options
export const customToast = (message, options = {}) => {
  toast(message, { ...toastConfig, ...options });
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Dismiss specific toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export default showToast;
