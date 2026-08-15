import React from "react";
import DesktopCheckout from "../components/DesktopCheckout";
import MobileCheckout from "../components/MobileCheckout";
import useMediaQuery from "../hooks/useMediaQuery";

const Checkout = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <DesktopCheckout /> : <MobileCheckout />;
};

export default Checkout;
