import React from "react";
import DesktopHome from "../components/DesktopHome";
import MobileHome from "../components/MobileHome";

const Home = () => {
  return (
    <>
      <div className="hidden md:block">
        <DesktopHome />
      </div>
      <div className="md:hidden">
        <MobileHome />
      </div>
    </>
  );
};

export default Home;
