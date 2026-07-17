import React from "react";
import DesktopProductDetails from "../components/DesktopProductDetails";
import MobileProductDetails from "../components/MobileProductDetails";

const ProductDetails = () => {
  return (
    <>
      <div className="hidden md:block">
        <DesktopProductDetails />
      </div>
      <div className="md:hidden">
        <MobileProductDetails />
      </div>
    </>
  );
};

export default ProductDetails;
