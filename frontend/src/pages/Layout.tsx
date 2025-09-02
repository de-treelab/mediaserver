import { Outlet } from "react-router";
import { SideBar } from "../sections/SideBar";

export const Layout = () => {
  return (
    <div className="h-full flex flex-row">
      <SideBar />
      <div className="flex-1 p-2">
        <Outlet />
      </div>
    </div>
  );
};
