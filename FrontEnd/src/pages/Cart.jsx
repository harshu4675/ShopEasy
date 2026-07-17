import React from "react";
import DesktopCart from "../components/DesktopCart";
import MobileCart from "../components/MobileCart";

const Cart = () => {
  return (
    <>
      <div className="hidden md:block">
        <DesktopCart />
      </div>
      <div className="md:hidden">
        <MobileCart />
      </div>
    </>
  );
};

export default Cart;
