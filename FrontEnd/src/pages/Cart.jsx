import React from "react";
import DesktopCart from "../components/DesktopCart";
import MobileCart from "../components/MobileCart";
import useMediaQuery from "../hooks/useMediaQuery";

const Cart = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <DesktopCart /> : <MobileCart />;
};

export default Cart;
