import { useEffect } from "react";
import { useNavigate } from "react-router";

export const NavigateToGalleryPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/gallery");
  }, [navigate]);

  return null;
};
