import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const PageLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />
            <div className="lg: ml-64">
                <Topbar/>
                <main className="p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
export default PageLayout;