import { AiOutlineUpload } from "react-icons/ai";
import { RiGalleryView2 } from "react-icons/ri";
import { FaHashtag } from "react-icons/fa";
import { SideBarButton } from "../components/SideBarButton";
import { useNavigate } from "react-router";

export const SideBar = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[100vh] inline-block p-2 bg-gray-700">
      <SideBarButton
        Icon={RiGalleryView2}
        pathPrefix="/gallery"
        onClick={() => {
          navigate("/gallery");
        }}
      />
      <SideBarButton
        Icon={AiOutlineUpload}
        pathPrefix="/upload"
        onClick={() => {
          navigate("/upload");
        }}
      />
      <SideBarButton
        Icon={FaHashtag}
        pathPrefix="/tags"
        onClick={() => {
          navigate("/tags");
        }}
      />
    </div>
  );
};
