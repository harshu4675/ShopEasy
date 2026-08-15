import React from "react";
import DesktopHome from "../components/DesktopHome";
import MobileHome from "../components/MobileHome";
import useMediaQuery from "../hooks/useMediaQuery";

const Home = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop ? <DesktopHome /> : <MobileHome />;
};

export default Home;
