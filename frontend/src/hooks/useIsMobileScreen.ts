import { useEffect, useState } from "react";

const MOBILE_SCREEN_WIDTH = 768;

export const useIsMobileScreen = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(
    window.innerWidth <= MOBILE_SCREEN_WIDTH,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_SCREEN_WIDTH);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
};
