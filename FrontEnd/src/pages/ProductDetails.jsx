import React from "react";
import DesktopProductDetails from "../components/DesktopProductDetails";
import MobileProductDetails from "../components/MobileProductDetails";
import useMediaQuery from "../hooks/useMediaQuery";

const ProductDetails = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <DesktopProductDetails /> : <MobileProductDetails />;
};

export default ProductDetails;
