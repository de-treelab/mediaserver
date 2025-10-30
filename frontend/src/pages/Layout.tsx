import { Outlet } from "react-router";
import { SideBar } from "../sections/SideBar";

export const Layout = () => {
  return (
    <div className="h-full flex flex-row max-h-[100vh]">
      <SideBar />
      <div className="flex-1 max-h-full overflow-y-auto bg-gray-900">
        <Outlet />
      </div>
    </div>
  );
};
