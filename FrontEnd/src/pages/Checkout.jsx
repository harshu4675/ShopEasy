import React from "react";
import DesktopCheckout from "../components/DesktopCheckout";
import MobileCheckout from "../components/MobileCheckout";

const Checkout = () => {
  return (
    <>
      <div className="hidden md:block">
        <DesktopCheckout />
      </div>
      <div className="md:hidden">
        <MobileCheckout />
      </div>
    </>
  );
};

export default Checkout;
