import { DashboardLayout } from "@/modules/auth/ui/layouts/dashboard-layout";

const Layout = ({children}: {children: React.ReactNode}) => {
    return ( 
        <DashboardLayout>
            {children}
        </DashboardLayout>
     );
}
 
export default Layout;